import type { ParticipantInfo, RoomId } from './types';

const MAX_PARTICIPANTS = 2;

/** A room holds at most two participant sockets, kept only in memory. */
interface Room {
  id: RoomId;
  participants: Map<string, ParticipantInfo>;
}

/**
 * In-memory room registry. No database is used; rooms are created on first
 * join and destroyed when the last participant leaves.
 */
export class RoomManager {
  private rooms = new Map<RoomId, Room>();

  /** Room IDs look like AB7K-XP29 (two groups of four upper-case/base32 chars). */
  static isValidRoomId(roomId: unknown): roomId is RoomId {
    return typeof roomId === 'string' && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(roomId);
  }

  private getOrCreate(roomId: RoomId): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { id: roomId, participants: new Map() };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  get(roomId: RoomId): Room | undefined {
    return this.rooms.get(roomId);
  }

  isFull(roomId: RoomId): boolean {
    const room = this.rooms.get(roomId);
    return !!room && room.participants.size >= MAX_PARTICIPANTS;
  }

  size(roomId: RoomId): number {
    return this.rooms.get(roomId)?.participants.size ?? 0;
  }

  /**
   * Attempt to add a participant. Returns the existing peer (if any) so the
   * caller can wire up signaling, or null when the room was empty.
   */
  join(
    roomId: RoomId,
    participant: ParticipantInfo,
  ): { peer: ParticipantInfo | null; isInitiator: boolean } {
    const room = this.getOrCreate(roomId);
    const existing = [...room.participants.values()];
    const peer = existing[0] ?? null;
    // First socket in the room becomes the initiator responsible for the offer.
    const isInitiator = existing.length === 0;
    room.participants.set(participant.socketId, participant);
    return { peer, isInitiator };
  }

  /** Remove a participant and drop the room when it becomes empty. */
  leave(roomId: RoomId, socketId: string): ParticipantInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const removed = room.participants.get(socketId) ?? null;
    room.participants.delete(socketId);
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }
    return removed;
  }

  /** True when the socket is a current member of the room. */
  isMember(roomId: RoomId, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    return !!room && room.participants.has(socketId);
  }

  otherParticipant(roomId: RoomId, socketId: string): ParticipantInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    for (const p of room.participants.values()) {
      if (p.socketId !== socketId) return p;
    }
    return null;
  }
}
