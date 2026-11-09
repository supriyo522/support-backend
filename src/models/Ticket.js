import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['open', 'pending', 'resolved'], default: 'open' },
    category: { type: String, enum: ['billing', 'technical', 'account', 'general'], default: 'general' },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'angry'], default: 'neutral' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['chat', 'form', 'email'], default: 'chat' },
    aiHandled: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    humanTakeover: { type: Boolean, default: false },
    appliedRules: [String],
    resolvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Ticket', ticketSchema);
