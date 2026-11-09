import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { analyzeMessage } from './ai.js';
import { searchKnowledge } from './knowledge.js';
import { applyRules } from './automation.js';

const room = (id) => `ticket:${id}`;

// Customer-visible messages go to the ticket room + agents; drafts go to agents only.
export function emitMessage(io, msg) {
  const target = msg.isDraft ? io.to('agents') : io.to(room(msg.ticket)).to('agents');
  target.emit('message', msg);
}
const emitTicket = (io, ticket) => io.to('agents').emit('ticket:updated', { id: ticket._id });

export async function createTicket({ name, email, subject, message, source = 'chat' }) {
  let customer = await User.findOne({ email });
  if (customer && customer.role !== 'customer') {
    const e = new Error('This email cannot be used for support requests');
    e.status = 400;
    throw e;
  }
  customer ??= await User.create({ name, email, role: 'customer' });
  return Ticket.create({
    customer: customer._id,
    subject: (subject || message).slice(0, 120),
    source,
  });
}

export async function handleCustomerMessage(io, ticket, content) {
  const msg = await Message.create({ ticket: ticket._id, sender: 'customer', content });
  emitMessage(io, msg);
  if (ticket.status === 'resolved') {
    ticket.status = 'open';
    ticket.resolvedAt = undefined;
  }

  // A human is already handling this ticket: no AI interference.
  if (ticket.humanTakeover) {
    await ticket.save();
    return emitTicket(io, ticket);
  }

  const [history, kb] = await Promise.all([
    Message.find({ ticket: ticket._id }).sort('createdAt').limit(12),
    searchKnowledge(content),
  ]);
  const analysis = await analyzeMessage({ content, history, kb });

  ticket.category = analysis.category;
  ticket.sentiment = analysis.sentiment;
  ticket.priority = analysis.priority;
  const { escalate } = await applyRules(ticket, analysis, content);

  const configuredThreshold = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.65);
  const threshold = Number.isFinite(configuredThreshold) ? configuredThreshold : 0.65;
  const autoReply =
    !escalate && !analysis.shouldEscalate && analysis.confidence >= threshold && analysis.suggestedReply;

  const aiMeta = {
    category: analysis.category,
    sentiment: analysis.sentiment,
    priority: ticket.priority,
    confidence: analysis.confidence,
    shouldEscalate: escalate || analysis.shouldEscalate,
    sources: analysis.sources,
  };

  if (autoReply) {
    ticket.aiHandled = true;
    ticket.escalated = false;
    ticket.status = 'pending';
    await ticket.save();
    emitMessage(io, await Message.create({ ticket: ticket._id, sender: 'ai', content: analysis.suggestedReply, aiMeta }));
  } else {
    ticket.escalated = true;
    ticket.status = 'open';
    await ticket.save();
    if (analysis.suggestedReply) {
      emitMessage(io, await Message.create({
        ticket: ticket._id, sender: 'ai', content: analysis.suggestedReply, isDraft: true, aiMeta,
      }));
    }
    emitMessage(io, await Message.create({
      ticket: ticket._id, sender: 'system',
      content: 'Thanks for your message. A support agent will join this conversation shortly.',
    }));
  }
  emitTicket(io, ticket);
}

export async function handleAgentReply(io, ticket, agent, content) {
  const msg = await Message.create({ ticket: ticket._id, sender: 'agent', content });
  ticket.humanTakeover = true;
  ticket.status = 'pending';
  if (!ticket.assignedAgent) ticket.assignedAgent = agent._id;
  await ticket.save();
  emitMessage(io, msg);
  emitTicket(io, ticket);
  return msg;
}
