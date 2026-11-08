import express from 'express';
import mongoose from 'mongoose';
import { optionalAuth, requireAuth } from '../auth.js';
import { publicRecipes } from '../controllers/recipeController.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import { rateLimit } from '../rateLimit.js';
import { authorFields, publicAuthor } from '../services/publicAuthor.js';

export const postRoutes = express.Router();
const notFound = (res) => res.status(404).json({ message: 'המתכון הציבורי לא נמצא' });
const fail = (res) => res.status(500).json({ message: 'לא ניתן לעדכן או לטעון את הדיון כרגע' });
const commentId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const count = (field) => ({ $size: { $ifNull: [field, []] } });
const publicPost = (id) => ({ _id: id, ...publicRecipes });

export function communityPosts(createdBy, viewerId, limit = 60) {
  return Recipe.aggregate([
    { $match: { ...publicRecipes, createdBy } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit },
    {
      $addFields: {
        likeCount: count('$likes'),
        commentCount: count('$comments'),
        liked: viewerId ? { $in: [viewerId, { $ifNull: ['$likes', []] }] } : { $literal: false },
      },
    },
    { $project: { likes: 0, comments: 0 } },
  ]);
}

postRoutes.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return notFound(res);
  next();
});

postRoutes.get('/:id', optionalAuth, async (req, res) => {
  try {
    const recipe = await Recipe.findOne(publicPost(req.params.id))
      .select('createdBy likes comments')
      .lean();
    if (!recipe) return notFound(res);
    const likes = recipe.likes ?? [];
    const comments = recipe.comments ?? [];
    const authors = await User.find({ _id: { $in: comments.map(({ author }) => author) } })
      .select(authorFields)
      .lean();
    const people = new Map(authors.map((author) => [String(author._id), publicAuthor(author)]));
    const viewer = req.user?._id;
    res.json({
      likeCount: likes.length,
      liked: likes.some((id) => id.equals(viewer)),
      comments: comments.map(({ _id, author, text, createdAt }) => ({
        id: _id,
        text,
        createdAt,
        author: people.get(String(author)),
        canDelete: author.equals(viewer) || recipe.createdBy?.equals(viewer) === true,
      })),
    });
  } catch {
    return fail(res);
  }
});

async function setLike(req, res) {
  const liked = req.method === 'PUT';
  try {
    const recipe = await Recipe.findOneAndUpdate(
      publicPost(req.params.id),
      { [liked ? '$addToSet' : '$pull']: { likes: req.user._id } },
      { new: true, timestamps: false }
    )
      .select({ likes: 1 })
      .lean();
    if (!recipe) return notFound(res);
    res.json({ liked, likeCount: recipe.likes?.length ?? 0 });
  } catch {
    return fail(res);
  }
}

const limitLikes = rateLimit({
  limit: 100,
  windowMs: 60000,
  keyFor: (req) => String(req.user._id),
});
postRoutes.put('/:id/like', requireAuth, limitLikes, setLike);
postRoutes.delete('/:id/like', requireAuth, limitLikes, setLike);

const limitComments = rateLimit({
  limit: 12,
  windowMs: 60000,
  keyFor: (req) => String(req.user._id),
});
postRoutes.post('/:id/comments', requireAuth, limitComments, async (req, res) => {
  const { id, text } = req.body ?? {};
  if (
    typeof id !== 'string' ||
    !commentId.test(id) ||
    typeof text !== 'string' ||
    !text.trim() ||
    text.trim().length > 600
  )
    return res.status(400).json({ message: 'כתבו תגובה באורך של עד 600 תווים' });

  const filter = publicPost(req.params.id);
  const comment = { _id: id, author: req.user._id, text: text.trim(), createdAt: new Date() };
  try {
    const result = await Recipe.updateOne(
      { ...filter, 'comments._id': { $ne: id }, $expr: { $lt: [count('$comments'), 250] } },
      { $push: { comments: comment } },
      { timestamps: false, runValidators: true }
    );
    if (!result.modifiedCount) {
      const recipe = await Recipe.findOne(filter)
        .select({ comments: { $elemMatch: { _id: id } } })
        .lean();
      if (!recipe) return notFound(res);
      const existing = recipe.comments?.[0];
      if (existing?.author.equals(req.user._id) && existing.text === comment.text) {
        comment.createdAt = existing.createdAt;
      } else {
        return res
          .status(409)
          .json({ message: existing ? 'התגובה כבר קיימת' : 'הדיון הגיע למגבלת התגובות' });
      }
    }
    res.status(result.modifiedCount ? 201 : 200).json({
      comment: {
        id,
        text: comment.text,
        createdAt: comment.createdAt,
        author: publicAuthor(req.user),
        canDelete: true,
      },
    });
  } catch {
    return fail(res);
  }
});

postRoutes.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const id = req.params.commentId;
  if (!commentId.test(id)) return notFound(res);
  try {
    const result = await Recipe.updateOne(
      {
        ...publicPost(req.params.id),
        $or: [
          { createdBy: req.user._id },
          { comments: { $elemMatch: { _id: id, author: req.user._id } } },
        ],
      },
      { $pull: { comments: { _id: id } } },
      { timestamps: false }
    );
    if (!result.matchedCount) return res.status(404).json({ message: 'התגובה לא נמצאה' });
    res.json({ ok: true });
  } catch {
    return fail(res);
  }
});
