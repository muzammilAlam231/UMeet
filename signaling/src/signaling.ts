import type { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const rooms = new RoomManager();

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return 'Guest';
  const trimmed = name.trim().slice(0, 40);
  return trimmed.length > 0 ? trimmed : 'Guest';
}

/**
 * Registers all signaling handlers for a single socket. The server only relays
 * SDP/ICE between the two members of a validated room; it never touches media.
 */
export function registerSignaling(io: IOServer, socket: IOSocket): void {
  socket.data.roomId = null;
  socket.data.displayName = 'Guest';

  // eslint-disable-next-line no-console
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, displayName }) => {
    if (!RoomManager.isValidRoomId(roomId)) {
      socket.emit('join-error', {
        code: 'invalid-room',
        message: 'Invalid meeting link.',
      });
      return;
    }

    if (rooms.isFull(roomId)) {
      socket.emit('join-error', {
        code: 'room-full',
        message: 'Meeting is full. Only 2 participants are allowed.',
      });
      return;
    }

    const name = sanitizeName(displayName);
    socket.data.roomId = roomId;
    socket.data.displayName = name;

    const { peer, isInitiator } = rooms.join(roomId, {
      socketId: socket.id,
      displayName: name,
    });

    socket.join(roomId);

    // eslint-disable-next-line no-console
    console.log(`[room ${roomId}] "${name}" joined (${socket.id}) — initiator=${isInitiator}, size=${rooms.size(roomId)}`);

    socket.emit('joined', {
      roomId,
      isInitiator,
      peer,
      self: { socketId: socket.id, displayName: name },
    });

    // Notify the peer already in the room.
    socket.to(roomId).emit('participant-joined', {
      socketId: socket.id,
      displayName: name,
    });
  });

  const relay = (
    event: 'offer' | 'answer' | 'ice-candidate',
    payload: { roomId: string; data: unknown },
  ) => {
    const { roomId, data } = payload ?? { roomId: '', data: null };
    // Only forward when the sender is a verified member of the room.
    if (!RoomManager.isValidRoomId(roomId) || !rooms.isMember(roomId, socket.id)) {
      return;
    }
    const peer = rooms.otherParticipant(roomId, socket.id);
    if (!peer) return;
    io.to(peer.socketId).emit(event, { roomId, data });
  };

  socket.on('offer', (payload) => relay('offer', payload));
  socket.on('answer', (payload) => relay('answer', payload));
  socket.on('ice-candidate', (payload) => relay('ice-candidate', payload));

  socket.on('connection-status', ({ roomId, status }) => {
    if (!RoomManager.isValidRoomId(roomId) || !rooms.isMember(roomId, socket.id)) {
      return;
    }
    socket.to(roomId).emit('connection-status', { socketId: socket.id, status });
  });

  const handleLeave = () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    rooms.leave(roomId, socket.id);
    socket.to(roomId).emit('participant-left', { socketId: socket.id });
    socket.leave(roomId);
    socket.data.roomId = null;
  };

  socket.on('leave-room', handleLeave);
  socket.on('disconnect', handleLeave);
}
