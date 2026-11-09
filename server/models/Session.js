import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: String,
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  passwordVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.model('Session', schema);
