import { Router } from 'express';
import User from '../models/User.js';
import { signStaff, staffAuth } from '../middleware/auth.js';

const r = Router();

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!user || user.role === 'customer' || !(await user.matchPassword(String(password || ''))))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: signStaff(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

r.get('/me', staffAuth(), (req, res) => {
  const { _id, name, email, role } = req.user;
  res.json({ id: _id, name, email, role });
});

// Admin creates agent accounts
r.post('/agents', staffAuth(['admin']), async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ error: 'name, email and a password of 8+ chars are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already in use' });
  const u = await User.create({ name, email, password: await User.hash(password), role: 'agent' });
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

r.get('/agents', staffAuth(), async (_req, res) => {
  res.json(await User.find({ role: { $in: ['agent', 'admin'] } }).select('name email role'));
});

export default r;
