import { Router } from 'express';
import AutomationRule from '../models/AutomationRule.js';
import { staffAuth } from '../middleware/auth.js';

const r = Router();
r.use(staffAuth(['admin']));

r.get('/', async (_req, res) => res.json(await AutomationRule.find().sort('-createdAt')));
r.post('/', async (req, res) => {
  const { name, conditions = {}, action } = req.body || {};
  if (!name || !action?.type) return res.status(400).json({ error: 'name and action.type required' });
  res.status(201).json(await AutomationRule.create({ name, conditions, action }));
});
r.patch('/:id', async (req, res) => {
  const rule = await AutomationRule.findByIdAndUpdate(req.params.id, { enabled: !!req.body.enabled }, { new: true });
  res.json(rule);
});
r.delete('/:id', async (req, res) => {
  await AutomationRule.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default r;
