import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import { staffAuth } from '../middleware/auth.js';
import { handleAgentReply } from '../services/ticketFlow.js';

const r = Router();
r.use(staffAuth());

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/', async (req, res) => {
  const { status, category, priority, sentiment, escalated, q } = req.query;
  const f = {};
  for (const [k, v] of Object.entries({ status, category, priority, sentiment })) if (v) f[k] = String(v);
  if (escalated === 'true') f.escalated = true;
  if (q) f.subject = new RegExp(esc(String(q)), 'i');
  const tickets = await Ticket.find(f)
    .populate('customer', 'name email')
    .populate('assignedAgent', 'name')
    .sort('-updatedAt')
    .limit(200);
  res.json(tickets);
});

r.get('/:id', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('customer', 'name email').populate('assignedAgent', 'name');
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  const messages = await Message.find({ ticket: ticket._id }).sort('createdAt');
  res.json({ ticket, messages });
});

r.patch('/:id', async (req, res) => {
  const allowed = ['status', 'priority', 'category', 'assignedAgent'];
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  for (const k of allowed) if (k in req.body) ticket[k] = req.body[k] || null;
  if (req.body.status === 'resolved') ticket.resolvedAt = new Date();
  await ticket.save();
  res.json(ticket);
});

r.post('/:id/reply', async (req, res) => {
  const content = String(req.body.content || '').trim().slice(0, 4000);
  if (!content) return res.status(400).json({ error: 'content required' });
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  res.status(201).json(await handleAgentReply(req.app.get('io'), ticket, req.user, content));
});

// Thumbs up/down on an AI message to track accuracy
r.post('/messages/:mid/feedback', async (req, res) => {
  const rating = req.body.rating;
  if (!['up', 'down'].includes(rating)) return res.status(400).json({ error: 'rating must be up or down' });
  const m = await Message.findOneAndUpdate({ _id: req.params.mid, sender: 'ai' }, { feedback: rating }, { new: true });
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

export default r;
