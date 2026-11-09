import { Router } from 'express';
import KnowledgeDoc from '../models/KnowledgeDoc.js';
import { staffAuth } from '../middleware/auth.js';

const r = Router();
r.use(staffAuth());

r.get('/', async (_req, res) => res.json(await KnowledgeDoc.find().sort('-updatedAt')));
r.post('/', staffAuth(['admin']), async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  res.status(201).json(await KnowledgeDoc.create({ title, content }));
});
r.delete('/:id', staffAuth(['admin']), async (req, res) => {
  await KnowledgeDoc.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default r;
