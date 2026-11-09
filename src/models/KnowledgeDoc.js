import mongoose from 'mongoose';

const docSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);
docSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('KnowledgeDoc', docSchema);
