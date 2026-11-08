import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  _id: String,
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 600 },
  createdAt: { type: Date, required: true },
});

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
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    ingredients: { type: [String], required: true },
    steps: { type: [String], required: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    likes: { type: [Schema.Types.ObjectId], select: false },
    comments: { type: [commentSchema], select: false },
  },
  { timestamps: true }
);

recipesSchema.index({ createdBy: 1, createdAt: -1 });
recipesSchema.index({ createdAt: -1, _id: -1 });
recipesSchema.index({ category: 1, difficulty: 1, createdAt: -1, _id: -1 });
recipesSchema.index({ totalMinutes: 1, _id: 1 });
recipesSchema.index({ title: 1, _id: 1 });

export default mongoose.model('Recipe', recipesSchema);
