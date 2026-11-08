import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  name: { type: String, required: true, maxlength: 60 },
  recipeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
});

collectionSchema.index({ owner: 1, key: 1 }, { unique: true });
export default mongoose.model('Collection', collectionSchema);
