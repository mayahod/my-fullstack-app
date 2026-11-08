import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../auth.js';
import { accessibleRecipes } from '../controllers/recipeController.js';
import Collection from '../models/Collection.js';
import Recipe from '../models/Recipe.js';

const router = express.Router();
const favorites = 'מועדפים';
const failure = (res) => res.status(500).json({ message: 'לא ניתן לעדכן את האוספים כרגע' });
const notFound = (res) => res.status(404).json({ message: 'המתכון או האוסף אינם זמינים' });

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, requireAuth);

router.get('/', async (req, res) => {
  const owner = req.user._id;
  try {
    const lists = await Collection.find({ owner }).sort({ name: 1 }).lean();
    const ids = lists.flatMap((list) => list.recipeIds);
    const visible = await Recipe.find({ _id: { $in: ids }, ...accessibleRecipes(owner) }).lean();
    const byId = new Map(visible.map((recipe) => [String(recipe._id), recipe]));
    const collections = lists.map((list) => ({
      id: list.key === favorites ? 'favorites' : list._id,
      name: list.name,
      recipes: list.recipeIds.map((id) => byId.get(String(id))).filter(Boolean),
    }));
    const index = collections.findIndex(({ id }) => id === 'favorites');
    const first =
      index === -1
        ? { id: 'favorites', name: favorites, recipes: [] }
        : collections.splice(index, 1)[0];
    res.json({ collections: [first, ...collections] });
  } catch {
    failure(res);
  }
});

router.put('/collections', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 60)
    return res.status(400).json({ message: 'בחרו שם לאוסף באורך של עד 60 תווים' });
  const key = name.toLowerCase();
  if (key === favorites) return res.json({ id: 'favorites', name: favorites });
  const filter = { owner: req.user._id, key };
  try {
    await Collection.init();
    const list = await Collection.findOneAndUpdate(
      filter,
      { $setOnInsert: { name } },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );
    res.json({ id: list._id, name: list.name });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'כבר קיים אוסף בשם הזה' });
    return failure(res);
  }
});

router.delete('/collections/:id', async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return notFound(res);
  try {
    await Collection.deleteOne({
      _id: req.params.id,
      owner: req.user._id,
      key: { $ne: favorites },
    });
    res.json({ deleted: true });
  } catch {
    failure(res);
  }
});

async function changeMembership(req, res) {
  const { id, recipeId } = req.params;
  const isDefault = id === 'favorites';
  if (
    (!isDefault && !mongoose.isObjectIdOrHexString(id)) ||
    !mongoose.isObjectIdOrHexString(recipeId)
  )
    return notFound(res);
  const owner = req.user._id;
  const adding = req.method === 'PUT';
  const filter = isDefault ? { owner, key: favorites } : { owner, _id: id };
  try {
    if (isDefault && adding) await Collection.init();
    if (adding && !(await Recipe.exists({ _id: recipeId, ...accessibleRecipes(owner) })))
      return notFound(res);
    const update = adding
      ? { $addToSet: { recipeIds: recipeId } }
      : { $pull: { recipeIds: recipeId } };
    if (isDefault && adding) update.$setOnInsert = { name: favorites };
    const result = await Collection.updateOne(filter, update, {
      upsert: isDefault && adding,
      setDefaultsOnInsert: false,
    });
    if (!isDefault && !result.matchedCount) return notFound(res);
    res.json({ saved: adding });
  } catch (error) {
    if (error.code === 11000 && isDefault && adding) {
      try {
        await Collection.updateOne(filter, { $addToSet: { recipeIds: recipeId } });
        return res.json({ saved: true });
      } catch {
        return failure(res);
      }
    }
    return failure(res);
  }
}

router.put('/collections/:id/recipes/:recipeId', changeMembership);
router.delete('/collections/:id/recipes/:recipeId', changeMembership);
export default router;
