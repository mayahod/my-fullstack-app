import { API_BASE as BASE_URL } from './config.js';

const RECIPE_REQUEST_TIMEOUT_MS = 90_000;

export async function searchRecipes(params, signal) {
  const response = await fetch(BASE_URL + '/api/recipes/catalog?' + params, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(RECIPE_REQUEST_TIMEOUT_MS)])
      : AbortSignal.timeout(RECIPE_REQUEST_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.recipes))
    throw new Error(data?.message || 'לא ניתן לטעון מתכונים כרגע. נסו שוב.');
  return data;
}

async function myRecipeRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}/api/recipes${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
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
  return data;
}

export const fetchMyRecipes = (signal) => myRecipeRequest('/mine', { signal });
export const updateMyRecipe = (id, recipe) =>
  myRecipeRequest(`/${id}`, { method: 'PATCH', body: JSON.stringify(recipe) });
export const deleteMyRecipe = (id) => myRecipeRequest(`/${id}`, { method: 'DELETE' });

export const addRecipe = (recipeData) =>
  myRecipeRequest('', { method: 'POST', body: JSON.stringify(recipeData) });
