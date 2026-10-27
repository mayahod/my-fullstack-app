import express from 'express';
import { requireAuth } from '../auth.js';
import {
  createRecipe,
  getAllRecipes,
  getSingleRecipe,
  deleteRecipe,
  updateRecipe,
  getRandomRecipe,
  getMyRecipes,
} from '../controllers/recipeController.js';

const router = express.Router();

/**
 * Read Only Permission Routes
 */
// GET all Recipes
router.get('/', getAllRecipes);

// GET a random Recipe
router.get('/random', getRandomRecipe);
router.get('/mine', requireAuth, getMyRecipes);

// GET a single recipe
router.get('/:id', getSingleRecipe);

/**
 * Read and Write Permission Routes
 */
// POST a new recipe
router.post('/', requireAuth, createRecipe);

// DELETE a recipe
router.delete('/:id', requireAuth, deleteRecipe);

// UPDATE a recipe
router.patch('/:id', requireAuth, updateRecipe);

export default router;
