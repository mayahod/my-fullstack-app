import Recipe from '../models/Recipe.js';
import { publicRecipes } from './recipeController.js';

const cardFields = 'title category imageUrl totalMinutes difficulty createdAt';
const projection = Object.fromEntries(cardFields.split(' ').map((field) => [field, 1]));
const sortOrders = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { title: 1, _id: 1 },
  nameDesc: { title: -1, _id: -1 },
  quickest: { totalMinutes: 1, _id: 1 },
  match: { matchedCount: -1, createdAt: -1, _id: -1 },
};

const escaped = (value) => value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
const toPattern = (value) => new RegExp(escaped(value), 'i');
const hasIngredient = (pattern) => ({
  $anyElementTrue: [
    {
      $map: {
        input: { $ifNull: ['$ingredients', []] },
        as: 'ingredient',
        in: { $regexMatch: { input: '$$ingredient', regex: pattern } },
      },
    },
  ],
});

export async function catalog(req, res) {
  const {
    q = '',
    ingredients = '',
    category = '',
    difficulty = '',
    maxMinutes = '',
    sort = 'newest',
    page = '1',
    pageSize = '12',
  } = req.query;
  const fields = [q, ingredients, category, difficulty, maxMinutes, sort, page, pageSize];
  if (fields.some((value) => typeof value !== 'string' || value.length > 160))
    return res.status(400).json({ message: 'אחד מפרטי החיפוש אינו תקין' });
  const index = Number(page);
  const size = Number(pageSize);
  const minutes = Number(maxMinutes);
  if (
    !Number.isInteger(index) ||
    index < 1 ||
    index > 500 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 24 ||
    (maxMinutes && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) ||
    (difficulty && !['easy', 'medium', 'hard', 'unrated'].includes(difficulty)) ||
    !Object.hasOwn(sortOrders, sort)
  )
    return res.status(400).json({ message: 'אחד מפרטי החיפוש אינו תקין' });

  const terms = [
    ...new Set(
      ingredients
        .split(/[,،\n]/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (terms.length > 8 || (sort === 'match' && !terms.length))
    return res.status(400).json({ message: 'יש להזין עד שמונה מצרכים, מופרדים בפסיקים' });

  const filters = { ...publicRecipes };
  if (q.trim()) {
    const pattern = toPattern(q.trim());
    filters.$or = [{ title: pattern }, { ingredients: pattern }];
  }
  if (category) filters.category = category;
  if (difficulty) filters.difficulty = difficulty === 'unrated' ? null : difficulty;
  if (maxMinutes || sort === 'quickest')
    filters.totalMinutes = { $gte: 1, ...(maxMinutes ? { $lte: minutes } : {}) };
  if (terms.length)
    filters.ingredients =
      sort === 'match' ? { $in: terms.map(toPattern) } : { $all: terms.map(toPattern) };

  try {
    const offset = (index - 1) * size;
    const [recipes, total] = await Promise.all([
      sort === 'match'
        ? Recipe.aggregate([
            { $match: filters },
            {
              $set: {
                matchedIngredients: {
                  $concatArrays: terms.map((term) => ({
                    $cond: [hasIngredient(toPattern(term)), [{ $literal: term }], []],
                  })),
                },
              },
            },
            { $set: { matchedCount: { $size: '$matchedIngredients' } } },
            { $sort: sortOrders.match },
            { $skip: offset },
            { $limit: size },
            { $project: { ...projection, matchedIngredients: 1 } },
          ])
        : Recipe.find(filters)
            .select(cardFields)
            .sort(sortOrders[sort])
            .skip(offset)
            .limit(size)
            .lean(),
      Recipe.countDocuments(filters),
    ]);
    res.json({ recipes, total, page: index, pageSize: size });
  } catch {
    res.status(500).json({ message: 'לא ניתן לחפש מתכונים כרגע' });
  }
}
