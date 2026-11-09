import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false }, // only staff have passwords
    role: { type: String, enum: ['customer', 'agent', 'admin'], default: 'customer' },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = function (plain) {
  return this.password ? bcrypt.compare(plain, this.password) : false;
};
userSchema.statics.hash = (plain) => bcrypt.hash(plain, 10);

export default mongoose.model('User', userSchema);
