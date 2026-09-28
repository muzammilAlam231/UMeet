/**
 * Frontend copy of the signaling message contracts. Kept in sync with the
 * signaling server's src/types.ts but duplicated so the two packages stay
 * decoupled and independently deployable.
 */

export type RoomId = string;

export interface ParticipantInfo {
  socketId: string;
  displayName: string;
}

export type JoinErrorCode = 'room-full' | 'invalid-room' | 'not-found';

export interface JoinErrorPayload {
  code: JoinErrorCode;
  message: string;
}

export interface JoinedPayload {
  roomId: RoomId;
  isInitiator: boolean;
  peer: ParticipantInfo | null;
  self: ParticipantInfo;
}

export interface SignalPayload {
  roomId: RoomId;
  data: unknown;
}

export interface ServerToClientEvents {
  joined: (payload: JoinedPayload) => void;
  'join-error': (payload: JoinErrorPayload) => void;
  'participant-joined': (payload: ParticipantInfo) => void;
  'participant-left': (payload: { socketId: string }) => void;
  offer: (payload: SignalPayload) => void;
  answer: (payload: SignalPayload) => void;
  'ice-candidate': (payload: SignalPayload) => void;
  'connection-status': (payload: { socketId: string; status: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (payload: { roomId: RoomId; displayName?: string }) => void;
  'leave-room': (payload: { roomId: RoomId }) => void;
  offer: (payload: SignalPayload) => void;
  answer: (payload: SignalPayload) => void;
  'ice-candidate': (payload: SignalPayload) => void;
  'connection-status': (payload: { roomId: RoomId; status: string }) => void;
}
