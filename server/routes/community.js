import express from 'express';
import mongoose from 'mongoose';
import { optionalAuth, requireAuth } from '../auth.js';
import { publicRecipes } from '../controllers/recipeController.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';

const router = express.Router();
const publicAuthor = ({ _id, firstName }) => ({ id: _id, firstName });
const fail = (res) => res.status(500).json({ message: 'לא ניתן לטעון את הקהילה כרגע' });
const notFound = (res) => res.status(404).json({ message: 'הפרופיל לא נמצא' });
const authorFields = 'firstName';
const getFollowing = async (id) => {
  const user = await User.findById(id).select('+following').lean();
  return user?.following ?? [];
};

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/people', async (req, res) => {
  try {
    const active = await Recipe.aggregate([
      { $match: { ...publicRecipes, createdBy: { $type: 'objectId' } } },
      { $group: { _id: '$createdBy', latest: { $max: '$createdAt' } } },
      { $sort: { latest: -1 } },
      { $limit: 60 },
    ]);
    const people = await User.find({ _id: { $in: active.map(({ _id }) => _id) } })
      .select(authorFields)
      .sort({ firstName: 1 })
      .lean();
    res.json({ people: people.map(publicAuthor) });
  } catch {
    return fail(res);
  }
});

router.get('/feed', requireAuth, async (req, res) => {
  try {
    const ids = await getFollowing(req.user._id);
    const [recipes, people] = await Promise.all([
      Recipe.find({ ...publicRecipes, createdBy: { $in: ids } })
        .sort({ createdAt: -1, _id: -1 })
        .limit(60)
        .lean(),
      User.find({ _id: { $in: ids } })
        .select(authorFields)
        .lean(),
    ]);
    const following = people.map(publicAuthor);
    const authors = new Map(following.map((author) => [String(author.id), author]));
    res.json({
      following,
      recipes: recipes.map((recipe) => ({
        ...recipe,
        author: authors.get(String(recipe.createdBy)),
      })),
    });
  } catch {
    return fail(res);
  }
});

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return notFound(res);
  next();
});

router.get('/people/:id', optionalAuth, async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();
    const [person, recipes, following] = await Promise.all([
      User.findById(id).select(authorFields).lean(),
      Recipe.find({ ...publicRecipes, createdBy: id })
        .sort({ createdAt: -1 })
        .limit(60)
        .lean(),
      req.user ? getFollowing(req.user._id) : [],
    ]);
    const isOwner = String(req.user?._id) === id;
    const isFollowing = following.some((authorId) => String(authorId) === id);
    if (!person || (!recipes.length && !isOwner && !isFollowing)) return notFound(res);
    res.json({ person: publicAuthor(person), recipes, isFollowing });
  } catch {
    return fail(res);
  }
});

router.put('/people/:id/follow', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (id.toLowerCase() === String(req.user._id)) {
    return res.status(400).json({ message: 'אי אפשר לעקוב אחרי הפרופיל שלך' });
  }
  try {
    const [person, published] = await Promise.all([
      User.exists({ _id: id }),
      Recipe.exists({ ...publicRecipes, createdBy: id }),
    ]);
    if (!person || !published) return notFound(res);
    await User.updateOne({ _id: req.user._id }, { $addToSet: { following: person._id } });
    res.json({ isFollowing: true });
  } catch {
    return fail(res);
  }
});

router.delete('/people/:id/follow', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { following: req.params.id } });
    res.json({ isFollowing: false });
  } catch {
    return fail(res);
  }
});

export default router;
