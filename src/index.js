import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import ticketRoutes from './routes/tickets.js';
import knowledgeRoutes from './routes/knowledge.js';
import automationRoutes from './routes/automation.js';
import analyticsRoutes from './routes/analytics.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required (see .env.example)');

// Express 4 does not catch async errors by itself; wrap 2-arg route handlers.
const wrap = (router) => {
  router.stack.forEach((layer) => {
    if (layer.route) layer.route.stack.forEach((l) => {
      const fn = l.handle;
      if (fn.length <= 2) l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    });
  });
  return router;
};

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,https://support-frontend-iota.vercel.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  return /^https:\/\/.*\.vercel\.app$/.test(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), wrap(authRoutes));
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, limit: 30 }), wrap(chatRoutes));
app.use('/api/tickets', wrap(ticketRoutes));
app.use('/api/knowledge', wrap(knowledgeRoutes));
app.use('/api/automation', wrap(automationRoutes));
app.use('/api/analytics', wrap(analyticsRoutes));
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB()
  .then(() => server.listen(port, () => console.log(`SupportGen API on :${port}`)))
  .catch((e) => { console.error(e); process.exit(1); });
