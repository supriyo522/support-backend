import AutomationRule from '../models/AutomationRule.js';

const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];

function matches(rule, ctx, text) {
  const c = rule.conditions || {};
  if (c.category && c.category !== ctx.category) return false;
  if (c.sentiment && c.sentiment !== ctx.sentiment) return false;
  if (c.priority && c.priority !== ctx.priority) return false;
  if (c.keyword && !text.toLowerCase().includes(c.keyword.toLowerCase())) return false;
  return true;
}

// Mutates `ticket`, returns { escalate }
export async function applyRules(ticket, analysis, text) {
  const rules = await AutomationRule.find({ enabled: true });
  let escalate = false;
  ticket.appliedRules = [];
  for (const rule of rules) {
    const ctx = { category: analysis.category, sentiment: analysis.sentiment, priority: ticket.priority };
    if (!matches(rule, ctx, text)) continue;
    const { type, value } = rule.action;
    if (type === 'escalate') escalate = true;
    if (type === 'set_priority' && PRIORITY_ORDER.includes(value)) ticket.priority = value;
    if (type === 'assign_agent' && value) ticket.assignedAgent = value;
    ticket.appliedRules.push(rule.name);
  }
  return { escalate };
}
