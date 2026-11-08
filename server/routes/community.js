import express from 'express';
import mongoose from 'mongoose';
import { optionalAuth, requireAuth } from '../auth.js';
import { publicRecipes } from '../controllers/recipeController.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import { rateLimit } from '../rateLimit.js';

const router = express.Router();
const publicAuthor = ({ _id, firstName, username }) => ({ id: _id, firstName, username });
const fail = (res) => res.status(500).json({ message: 'לא ניתן לטעון את הקהילה כרגע' });
const notFound = (res) => res.status(404).json({ message: 'הפרופיל לא נמצא' });
const authorFields = 'firstName username';
const getFollowing = async (id) => {
  const user = await User.findById(id).select('+following').lean();
  return user?.following ?? [];
};

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/people', async (req, res) => {
  const query = req.query.q ?? '';
  if (typeof query !== 'string' || query.length > 80) {
    return res.status(400).json({ message: 'מילת החיפוש אינה תקינה' });
  }
  const term = query
    .trim()
    .replace(/^@/, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const search = term
    ? {
        $or: [
          { username: { $regex: '^' + term, $options: 'i' } },
          { firstName: { $regex: term, $options: 'i' } },
        ],
      }
    : {};
  try {
    const people = await User.aggregate([
      { $match: search },
      { $project: { firstName: 1, username: 1 } },
      { $sort: { firstName: 1, _id: 1 } },
      {
        $lookup: {
          from: Recipe.collection.name,
          localField: '_id',
          foreignField: 'createdBy',
          pipeline: [{ $match: publicRecipes }, { $limit: 1 }, { $project: { _id: 1 } }],
          as: 'published',
        },
      },
      {
        $match: { $or: [{ username: { $type: 'string' } }, { 'published.0': { $exists: true } }] },
      },
      { $limit: 60 },
    ]);
    res.json({ people: people.map(publicAuthor) });
  } catch {
    return fail(res);
  }
});

router.patch('/profile', requireAuth, rateLimit({ limit: 12 }), async (req, res) => {
  const value = req.body?.username;
  if (typeof value !== 'string' || value.length > 80) {
    return res.status(400).json({ message: 'שם המשתמש אינו תקין' });
  }
  const username = value.trim().replace(/^@/, '').toLowerCase();
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return res.status(400).json({ message: 'בחרו 3-24 אותיות באנגלית, ספרות או קו תחתון' });
  }
  try {
    await User.init();
    const update = username ? { $set: { username } } : { $unset: { username: 1 } };
    const person = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    })
      .select(authorFields)
      .lean();
    if (!person) return notFound(res);
    res.json({ person: publicAuthor(person) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'שם המשתמש הזה כבר תפוס' });
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
    if (!person || (!person.username && !recipes.length && !isOwner && !isFollowing))
      return notFound(res);
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
      User.findById(id).select('username').lean(),
      Recipe.exists({ ...publicRecipes, createdBy: id }),
    ]);
    if (!person || (!person.username && !published)) return notFound(res);
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
