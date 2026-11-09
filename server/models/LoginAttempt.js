import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  count: Number,
  nextAllowedAt: Date,
  expiresAt: { type: Date, expires: 0 },
});

export default mongoose.model('LoginAttempt', schema);
