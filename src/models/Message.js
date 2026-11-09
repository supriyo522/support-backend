import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    sender: { type: String, enum: ['customer', 'ai', 'agent', 'system'], required: true },
    content: { type: String, required: true },
    isDraft: { type: Boolean, default: false }, // AI suggestion visible to agents only
    aiMeta: {
      category: String,
      sentiment: String,
      priority: String,
      confidence: Number,
      shouldEscalate: Boolean,
      sources: [String],
    },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
