import mongoose from 'mongoose';

// All specified conditions must match. Empty condition = ignored.
const ruleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    conditions: {
      category: String,
      sentiment: String,
      priority: String,
      keyword: String,
    },
    action: {
      type: { type: String, enum: ['set_priority', 'escalate', 'assign_agent'], required: true },
      value: String, // priority level, or agent id for assign_agent
    },
  },
  { timestamps: true }
);

export default mongoose.model('AutomationRule', ruleSchema);
