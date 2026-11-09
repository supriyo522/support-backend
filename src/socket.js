import { Server } from 'socket.io';
import User from './models/User.js';
import Ticket from './models/Ticket.js';
import { verifyToken } from './middleware/auth.js';
import { handleCustomerMessage } from './services/ticketFlow.js';

const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,https://support-frontend-iota.vercel.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const p = verifyToken(socket.handshake.auth?.token);
      if (p.role === 'guest') {
        socket.data = { role: 'guest', ticketId: p.ticketId };
      } else {
        const user = await User.findById(p.id);
        if (!user || user.role === 'customer') throw new Error('bad user');
        socket.data = { role: user.role, userId: user.id };
      }
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { role, ticketId } = socket.data;
    if (role === 'guest') {
      socket.join(`ticket:${ticketId}`);
      socket.on('customer:message', async (content) => {
        const text = String(content || '').trim().slice(0, 4000);
        if (!text) return;
        const ticket = await Ticket.findById(ticketId);
        if (ticket) handleCustomerMessage(io, ticket, text).catch((e) => console.error(e));
      });
    } else {
      socket.join('agents');
    }
  });

  return io;
}
