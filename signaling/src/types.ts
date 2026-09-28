/**
 * Shared signaling message contracts.
 * These types are duplicated on the frontend to keep the two packages decoupled.
 */

export type RoomId = string;

export interface JoinRoomPayload {
  roomId: RoomId;
  displayName?: string;
}

export interface SignalPayload {
  roomId: RoomId;
  /** SDP or ICE payload, opaque to the server. */
  data: unknown;
}

export interface ParticipantInfo {
  socketId: string;
  displayName: string;
}

/** Reasons a join can be rejected. */
export type JoinErrorCode =
  | 'room-full'
  | 'invalid-room'
  | 'not-found';

export interface JoinErrorPayload {
  code: JoinErrorCode;
  message: string;
}

export interface JoinedPayload {
  roomId: RoomId;
  /** True when this socket is the first participant and should act as the offer initiator. */
  isInitiator: boolean;
  /** The other participant already present, if any. */
  peer: ParticipantInfo | null;
  self: ParticipantInfo;
}

/** Client -> Server events. */
export interface ClientToServerEvents {
  'join-room': (payload: JoinRoomPayload) => void;
  'leave-room': (payload: { roomId: RoomId }) => void;
  offer: (payload: SignalPayload) => void;
  answer: (payload: SignalPayload) => void;
  'ice-candidate': (payload: SignalPayload) => void;
  'connection-status': (payload: { roomId: RoomId; status: string }) => void;
}

/** Server -> Client events. */
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

export interface SocketData {
  roomId: RoomId | null;
  displayName: string;
}
