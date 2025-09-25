const express = require('express');

const { createRecipe,
    getAllRecipes,
    getSingleRecipe,
    deleteRecipe,
    updateRecipe,
    getRandomRecipe,
 } = require('../controllers/recipeController')

const router = express.Router()

/**
 * Read Only Permission Routes
 */
// GET all Recipes
router.get('/', getAllRecipes)

// GET a random Recipe
router.get('/random', getRandomRecipe);

// GET a single recipe
router.get('/:id', getSingleRecipe)

/**
 * Read and Write Permission Routes
 */
// POST a new recipe
router.post('/', createRecipe)

// DELETE a recipe
router.delete('/:id', deleteRecipe)

// UPDATE a recipe
router.patch('/:id', updateRecipe)

module.exports = router
