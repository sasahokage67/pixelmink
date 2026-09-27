import { createServer } from 'node:http';
import { Server } from 'socket.io';

// Vercel WebSocket Function. Socket.IO's internal /socket.io suffix is appended
// to this function path, yielding /api/socket-io/socket.io on the client.
const { registerVercelRealtime } = require('../server/vercel-realtime');
const server = createServer();
const io = new Server(server, {
  transports: ['websocket'],
  cors: { origin: true, methods: ['GET', 'POST'] },
});

registerVercelRealtime(io);

export default server;
