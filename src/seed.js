import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import KnowledgeDoc from './models/KnowledgeDoc.js';
import AutomationRule from './models/AutomationRule.js';

await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/supportgen');

const upsert = async (email, name, password, role) => {
  if (!(await User.findOne({ email }))) await User.create({ name, email, role, password: await User.hash(password) });
};
await upsert('admin@supportgen.ai', 'Admin', 'Admin@12345', 'admin');
await upsert('agent@supportgen.ai', 'Sam Agent', 'Agent@12345', 'agent');

if (!(await KnowledgeDoc.countDocuments())) {
  await KnowledgeDoc.insertMany([
    { title: 'Resetting your password', content: 'Go to the login page and click "Forgot password". Enter your email and we will send a reset link that is valid for 30 minutes. Check your spam folder if you do not see it.' },
    { title: 'Refund policy', content: 'Subscriptions can be refunded within 14 days of purchase. After 14 days, refunds are handled case by case by our billing team. Refunds take 5-7 business days to appear.' },
    { title: 'Changing your plan', content: 'Open Settings > Billing > Change plan. Upgrades apply immediately and are prorated. Downgrades take effect at the end of the current billing cycle.' },
    { title: 'Supported browsers', content: 'We support the latest two versions of Chrome, Firefox, Safari and Edge. If the app shows a blank page, clear your cache and disable extensions.' },
  ]);
}
if (!(await AutomationRule.countDocuments())) {
  await AutomationRule.insertMany([
    { name: 'Angry billing customer -> urgent + human', conditions: { category: 'billing', sentiment: 'angry' }, action: { type: 'escalate' } },
    { name: 'Angry customer -> urgent priority', conditions: { sentiment: 'angry' }, action: { type: 'set_priority', value: 'urgent' } },
    { name: 'Legal keywords -> escalate', conditions: { keyword: 'lawyer' }, action: { type: 'escalate' } },
  ]);
}
console.log('Seeded. Staff logins: admin@supportgen.ai / Admin@12345, agent@supportgen.ai / Agent@12345');
await mongoose.disconnect();
