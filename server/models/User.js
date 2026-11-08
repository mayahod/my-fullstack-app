import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  passwordVersion: { type: Number, default: 0 },
  username: { type: String, match: /^[a-z0-9_]{3,24}$/ },
  following: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', select: false },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  resetRequestedAt: { type: Date, select: false },
});

userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: 'string' } } }
);

export default mongoose.model('User', userSchema);
