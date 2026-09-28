import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSignaling } from './signaling';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types';

const PORT = Number(process.env.PORT ?? 4000);

// Comma-separated list of allowed origins. Defaults to any origin in dev.
const ORIGIN_ENV = process.env.CORS_ORIGIN?.trim();
const allowedOrigins =
  ORIGIN_ENV && ORIGIN_ENV.length > 0
    ? ORIGIN_ENV.split(',').map((o) => o.trim())
    : '*';

const httpServer = createServer((req, res) => {
  // Minimal health check endpoint for uptime monitors / free hosts.
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'umeet-signaling' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  registerSignaling(io, socket);
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UMeet signaling server listening on port ${PORT}`);
});
