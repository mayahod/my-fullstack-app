import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  passwordVersion: { type: Number, default: 0 },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  resetRequestedAt: { type: Date, select: false },
});

export default mongoose.model('User', userSchema);
