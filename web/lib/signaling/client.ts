import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from './types';

export type SignalingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Create (but do not auto-connect) a typed Socket.IO client for signaling.
 * The URL is read from NEXT_PUBLIC_SIGNALING_URL and falls back to localhost
 * for development.
 */
export function createSignalingSocket(): SignalingSocket {
  const url =
    process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

  return io(url, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}
