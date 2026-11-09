// Public customer endpoints (chat widget + web form). Customers authenticate with a ticket-scoped token.
import { Router } from 'express';
import Message from '../models/Message.js';
import { guestAuth, signGuest } from '../middleware/auth.js';
import { createTicket, handleCustomerMessage } from '../services/ticketFlow.js';

const r = Router();
const clean = (s, max) => String(s || '').trim().slice(0, max);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

r.post('/start', async (req, res) => {
  const name = clean(req.body.name, 80);
  const email = clean(req.body.email, 120).toLowerCase();
  const message = clean(req.body.message, 4000);
  const subject = clean(req.body.subject, 120);
  const source = req.body.source === 'form' ? 'form' : 'chat';
  if (!name || !emailOk(email) || !message) return res.status(400).json({ error: 'name, valid email and message are required' });

  const ticket = await createTicket({ name, email, subject, message, source });
  const io = req.app.get('io');
  // Respond immediately; the AI reply arrives over the socket.
  res.status(201).json({ ticketId: ticket._id, token: signGuest(ticket._id) });
  handleCustomerMessage(io, ticket, message).catch((e) => console.error('flow error', e));
});

r.get('/:id/messages', guestAuth, async (req, res) => {
  res.json(await Message.find({ ticket: req.ticket._id, isDraft: false }).sort('createdAt'));
});

r.post('/:id/messages', guestAuth, async (req, res) => {
  const content = clean(req.body.content, 4000);
  if (!content) return res.status(400).json({ error: 'content required' });
  res.status(202).json({ ok: true });
  handleCustomerMessage(req.app.get('io'), req.ticket, content).catch((e) => console.error('flow error', e));
});

// Customer confirms the issue is solved
r.post('/:id/resolve', guestAuth, async (req, res) => {
  req.ticket.status = 'resolved';
  req.ticket.resolvedAt = new Date();
  await req.ticket.save();
  req.app.get('io').to('agents').emit('ticket:updated', { id: req.ticket._id });
  res.json({ ok: true });
});

export default r;
