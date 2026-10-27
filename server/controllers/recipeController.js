// server/controllers/recipesController.js
import Recipe from '../models/Recipe.js';

// GET /api/recipes
const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.status(200).json({ recipes });
  } catch (err) {
    res.status(500).json({ mssg: 'Error getting recipes', err });
  }
};

// GET /api/recipes/random
const getMyRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ recipes });
  } catch {
    return res.status(500).json({ message: 'לא ניתן לטעון את המתכונים כרגע' });
  }
};

const getRandomRecipe = async (req, res) => {
  try {
    const count = await Recipe.countDocuments();
    if (count === 0) return res.status(200).json(null);
    const random = Math.floor(Math.random() * count);
    const randomRecipe = await Recipe.findOne().skip(random);
    res.status(200).json(randomRecipe);
  } catch (err) {
    res.status(500).json({ mssg: 'Error fetching random recipe', err });
  }
};

// GET /api/recipes/:id
const getSingleRecipe = async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Invalid recipe id', err });
  }
};

// // POST /api/recipes
// const createRecipe = async (req, res) => {
//   let { title, ingredients, steps, category, imageUrl } = req.body;

//   try {
//     if (typeof ingredients === 'string') {
//       ingredients = ingredients
//         .split('\n')
//         .map((line) => line.trim())
//         .filter((line) => line.length > 0);
//     }

//     if (typeof steps === 'string') {
//       steps = steps
//         .split('\n')
//         .map((line) => line.trim())
//         .filter((line) => line.length > 0);
//     }

//     const recipe = await Recipe.create({
//       title,
//       ingredients,
//       steps,
//       category,
//       imageUrl,
//     });

//     res.status(201).json({ recipe });
//   } catch (err) {
//     console.error('Error creating recipe:', err.message);
//     res.status(400).json({ mssg: 'Error creating recipe', err });
//   }
// };

const createRecipe = async (req, res) => {
  let { title, ingredients, steps, category, imageUrl } = req.body;
  const createdBy = req.user._id;

  try {
    if (typeof ingredients === 'string') {
      ingredients = ingredients.split('\n').map((line) => line.trim()).filter(Boolean);
    }

    if (typeof steps === 'string') {
      steps = steps.split('\n').map((line) => line.trim()).filter(Boolean);
    }

    const recipe = await Recipe.create({
      title,
      ingredients,
      steps,
      category,
      imageUrl,
      createdBy,
    });

    res.status(201).json({ recipe });
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

  const allowed = ['title', 'category', 'imageUrl', 'ingredients', 'steps'];
  const update = {};
  for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
  for (const key of ['ingredients', 'steps']) {
    if (typeof update[key] === 'string') update[key] = update[key].split('\n').map((line) => line.trim()).filter(Boolean);
  }
  for (const key of ['title', 'category', 'imageUrl']) {
    if (typeof update[key] === 'string') update[key] = update[key].trim();
  }
  if (['ingredients', 'steps'].some((key) => update[key] !== undefined && (!Array.isArray(update[key]) || !update[key].length || update[key].some((line) => typeof line !== 'string' || !line.trim())))) {
    return res.status(400).json({ message: 'יש להזין לפחות מצרך אחד ושלב הכנה אחד' });
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ mssg: 'No fields provided to update' });
  }

  try {
    const recipe = await Recipe.findOneAndUpdate({ _id: id, createdBy: req.user._id }, update, {
      new: true,
      runValidators: true,
    });
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Error updating recipe', err });
  }
};

export {
  getMyRecipes,
  getAllRecipes,
  getRandomRecipe,
  getSingleRecipe,
  createRecipe,
  deleteRecipe,
  updateRecipe,
};
