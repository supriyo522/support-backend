import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';

const secret = () => process.env.JWT_SECRET;
export const signStaff = (u) => jwt.sign({ id: u._id, role: u.role }, secret(), { expiresIn: '7d' });
// Customers get a token scoped to ONE ticket (no account / password needed)
export const signGuest = (ticketId) => jwt.sign({ ticketId: String(ticketId), role: 'guest' }, secret(), { expiresIn: '7d' });
export const verifyToken = (t) => jwt.verify(t, secret());

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

export const staffAuth = (roles = []) => async (req, res, next) => {
  try {
    const t = bearer(req);
    if (!t) return res.status(401).json({ error: 'Unauthorized' });
    const p = verifyToken(t);
    const user = p.id && (await User.findById(p.id));
    if (!user || user.role === 'customer') return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const guestAuth = async (req, res, next) => {
  try {
    const t = bearer(req);
    const p = t && verifyToken(t);
    if (!p || p.role !== 'guest' || p.ticketId !== req.params.id)
      return res.status(401).json({ error: 'Unauthorized' });
    req.ticket = await Ticket.findById(p.ticketId);
    if (!req.ticket) return res.status(404).json({ error: 'Ticket not found' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
