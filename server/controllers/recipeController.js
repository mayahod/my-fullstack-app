import Recipe from '../models/Recipe.js';

// Documents published before visibility was introduced remain public. Lean reads
// preserve the absence of this field instead of applying the new-document default.
export const publicRecipes = { isPublic: { $ne: false } };
export const accessibleRecipes = (userId) => ({
  $or: [publicRecipes, { createdBy: userId }],
});
const serializeRecipe = (recipe) => recipe && { ...recipe, isPublic: recipe.isPublic !== false };

// GET /api/recipes
const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find(publicRecipes).lean();
    res.status(200).json({ recipes: recipes.map(serializeRecipe) });
  } catch (err) {
    res.status(500).json({ mssg: 'Error getting recipes', err });
  }
};

// GET /api/recipes/mine
const getMyRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ recipes: recipes.map(serializeRecipe) });
  } catch {
    return res.status(500).json({ message: 'לא ניתן לטעון את המתכונים כרגע' });
  }
};

const getRandomRecipe = async (req, res) => {
  try {
    const count = await Recipe.countDocuments(publicRecipes);
    if (count === 0) return res.status(200).json(null);
    const random = Math.floor(Math.random() * count);
    const randomRecipe = await Recipe.findOne(publicRecipes).skip(random).lean();
    res.status(200).json(serializeRecipe(randomRecipe));
  } catch (err) {
    res.status(500).json({ mssg: 'Error fetching random recipe', err });
  }
};

// GET /api/recipes/:id
const getSingleRecipe = async (req, res) => {
  const { id } = req.params;
  try {
    const access = req.user ? accessibleRecipes(req.user._id) : publicRecipes;
    const recipe = await Recipe.findOne({ _id: id, ...access }).lean();
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe: serializeRecipe(recipe) });
  } catch (err) {
    res.status(400).json({ mssg: 'Invalid recipe id', err });
  }
};

const createRecipe = async (req, res) => {
  let {
    title,
    ingredients,
    steps,
    category,
    imageUrl,
    totalMinutes,
    difficulty,
    isPublic = false,
  } = req.body;
  const createdBy = req.user._id;
  if (typeof isPublic !== 'boolean')
    return res.status(400).json({ message: 'בחירת הפרטיות אינה תקינה' });
  if (!validDuration(totalMinutes)) return invalidDuration(res);

  try {
    if (typeof ingredients === 'string') {
      ingredients = ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }

    if (typeof steps === 'string') {
      steps = steps
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }

    const recipe = await Recipe.create({
      title,
      ingredients,
      steps,
      category,
      imageUrl,
      totalMinutes,
      difficulty: difficulty || undefined,
      isPublic,
      createdBy,
    });

    const { likes, comments, ...created } = recipe.toObject();
    res.status(201).json({ recipe: created });
  } catch (err) {
    console.error('Error creating recipe:', err.message);
    res.status(400).json({ mssg: 'Error creating recipe', err });
  }
};

// DELETE /api/recipes/:id
const deleteRecipe = async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findOneAndDelete({ _id: id, createdBy: req.user._id });
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Error deleting recipe', err });
  }
};

// PATCH /api/recipes/:id
const updateRecipe = async (req, res) => {
  const { id } = req.params;

  const editableFields = [
    'title',
    'category',
    'imageUrl',
    'ingredients',
    'steps',
    'isPublic',
    'totalMinutes',
    'difficulty',
  ];
  if (!validDuration(req.body.totalMinutes)) return invalidDuration(res);
  if (req.body.isPublic !== undefined && typeof req.body.isPublic !== 'boolean') {
    return res.status(400).json({ message: 'בחירת הפרטיות אינה תקינה' });
  }
  const update = {};
  for (const key of editableFields) if (req.body[key] !== undefined) update[key] = req.body[key];
  for (const key of ['ingredients', 'steps']) {
    if (typeof update[key] === 'string')
      update[key] = update[key]
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
  }
  for (const key of ['title', 'category', 'imageUrl']) {
    if (typeof update[key] === 'string') update[key] = update[key].trim();
  }
  if (update.difficulty === '') {
    delete update.difficulty;
    update.$unset = { difficulty: 1 };
  }
  if (
    ['ingredients', 'steps'].some(
      (key) =>
        update[key] !== undefined &&
        (!Array.isArray(update[key]) ||
          !update[key].length ||
          update[key].some((line) => typeof line !== 'string' || !line.trim()))
    )
  ) {
    return res.status(400).json({ message: 'יש להזין לפחות מצרך אחד ושלב הכנה אחד' });
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ mssg: 'No fields provided to update' });
  }

  try {
    const recipe = await Recipe.findOneAndUpdate({ _id: id, createdBy: req.user._id }, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe: serializeRecipe(recipe) });
  } catch (err) {
    res.status(400).json({ mssg: 'Error updating recipe', err });
  }
};

const validDuration = (value) =>
  value == null || (Number.isInteger(value) && value >= 1 && value <= 1440);
const invalidDuration = (res) =>
  res.status(400).json({ message: 'זמן הכנה צריך להיות בין 1 ל-1440 דקות' });

export {
  getMyRecipes,
  getAllRecipes,
  getRandomRecipe,
  getSingleRecipe,
  createRecipe,
  deleteRecipe,
  updateRecipe,
};
