// server/controllers/recipesController.js
const Recipe = require('../models/Recipe');

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

// POST /api/recipes 
const createRecipe = async (req, res) => {
  const { title, description, category, imageUrl } = req.body;
  try {
    const recipe = await Recipe.create({ title, description, category, imageUrl });
    res.status(201).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Error creating recipe', err });
  }
};

// DELETE /api/recipes/:id 
const deleteRecipe = async (req, res) => {
  const { id } = req.params;
  try {
    const recipe = await Recipe.findByIdAndDelete(id);
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Error deleting recipe', err });
  }
};

// PATCH /api/recipes/:id 
const updateRecipe = async (req, res) => {
  const { id } = req.params;

  const allowed = ['title', 'description', 'category', 'imageUrl'];
  const update = {};
  for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ mssg: 'No fields provided to update' });
  }

  try {
    const recipe = await Recipe.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!recipe) return res.status(404).json({ mssg: 'Recipe not found' });
    res.status(200).json({ recipe });
  } catch (err) {
    res.status(400).json({ mssg: 'Error updating recipe', err });
  }
};

module.exports = {
  getAllRecipes,
  getRandomRecipe,
  getSingleRecipe,
  createRecipe,
  deleteRecipe,
  updateRecipe,
};
