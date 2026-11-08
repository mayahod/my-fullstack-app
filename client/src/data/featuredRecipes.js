import starterRecipes from './starterRecipes.json';

// Only recipes bundled with the app can be shown without checking server visibility.
export const featuredRecipes = starterRecipes.map((recipe) => ({
  ...recipe,
  _id: 'featured-' + recipe.imageUrl.split('/').pop().replace('.svg', ''),
}));
