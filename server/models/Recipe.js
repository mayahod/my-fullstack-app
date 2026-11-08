import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const recipesSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    totalMinutes: {
      type: Number,
      min: 1,
      max: 1440,
      validate: (value) => value == null || Number.isInteger(value),
    },
    isPublic: { type: Boolean, default: false },
    ingredients: { type: [String], required: true },
    steps: { type: [String], required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

recipesSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('Recipe', recipesSchema);
