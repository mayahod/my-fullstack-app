import { API_BASE as BASE_URL } from './config.js';

// Cache only the public list; authenticated requests always go to the server.
const RECIPE_CACHE_TTL_MS = 30_000;
const RECIPE_REQUEST_TIMEOUT_MS = 90_000;

let recipeCache = null;
let cachedAt = 0;
let pendingRecipes = null;
const invalidateRecipes = () => {
  recipeCache = null;
  cachedAt = 0;
};
export const getCachedRecipe = (id) => recipeCache?.find((recipe) => recipe._id === id) || null;

async function myRecipeRequest(path, token, options = {}) {
  const response = await fetch(`${BASE_URL}/api/recipes${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? 'ההתחברות פגה. יש להתחבר מחדש.'
        : response.status === 404
          ? 'המתכון לא נמצא או שאינו שייך לחשבון שלך.'
          : data.message || 'הפעולה נכשלה. נסו שוב.'
    );
    error.status = response.status;
    throw error;
  }
  if (options.method) invalidateRecipes();
  return data;
}

export const fetchMyRecipes = (token, signal) => myRecipeRequest('/mine', token, { signal });
export const updateMyRecipe = (id, recipe, token) =>
  myRecipeRequest(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(recipe) });
export const deleteMyRecipe = (id, token) => myRecipeRequest(`/${id}`, token, { method: 'DELETE' });

export async function fetchRecipes() {
  if (recipeCache && Date.now() - cachedAt < RECIPE_CACHE_TTL_MS) return recipeCache;
  if (pendingRecipes) return pendingRecipes;
  pendingRecipes = (async () => {
    const response = await fetch(`${BASE_URL}/api/recipes`, {
      signal: AbortSignal.timeout(RECIPE_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('לא ניתן לטעון את המתכונים כרגע. נסו שוב.');
    const data = await response.json();
    recipeCache = Array.isArray(data) ? data : data.recipes || [];
    cachedAt = Date.now();
    return recipeCache;
  })();
  try {
    return await pendingRecipes;
  } finally {
    pendingRecipes = null;
  }
}

export const addRecipe = async (recipeData, token) => {
  try {
    const response = await fetch(`${BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(recipeData),
    });

    if (!response.ok) {
      throw new Error('שגיאה בעת הוספת המתכון');
    }

    const data = await response.json();
    invalidateRecipes();
    return data;
  } catch (error) {
    console.error('Add recipe error:', error);
    throw error;
  }
};
