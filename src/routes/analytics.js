import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import { staffAuth } from '../middleware/auth.js';

const r = Router();
r.use(staffAuth());

const group = (field) => Ticket.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
const toMap = (rows) => Object.fromEntries(rows.map((x) => [x._id, x.count]));

r.get('/', async (_req, res) => {
  const since = new Date(Date.now() - 7 * 864e5);
  const [total, byStatus, byCategory, bySentiment, aiResolved, resolutionTime, up, down, daily] = await Promise.all([
    Ticket.countDocuments(),
    group('status'),
    group('category'),
    group('sentiment'),
    Ticket.countDocuments({ aiHandled: true, humanTakeover: false }),
    Ticket.aggregate([
      { $match: { resolvedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
    ]),
    Message.countDocuments({ sender: 'ai', feedback: 'up' }),
    Message.countDocuments({ sender: 'ai', feedback: 'down' }),
    Ticket.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  res.json({
    total,
    byStatus: toMap(byStatus),
    byCategory: toMap(byCategory),
    bySentiment: toMap(bySentiment),
    aiResolutionRate: total ? aiResolved / total : 0,
    avgResolutionMinutes: resolutionTime[0] ? Math.round(resolutionTime[0].avg / 60000) : null,
    aiAccuracy: up + down ? up / (up + down) : null,
    feedbackCount: up + down,
    daily: daily.map((d) => ({ date: d._id, count: d.count })),
  });
});

export default r;
