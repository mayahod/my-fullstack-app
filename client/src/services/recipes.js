import { API_BASE as BASE_URL } from './config';

async function myRecipeRequest(path, token, options = {}) {
  const response = await fetch(`${BASE_URL}/api/recipes${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 401 ? 'ההתחברות פגה. יש להתחבר מחדש.' : response.status === 404 ? 'המתכון לא נמצא או שאינו שייך לחשבון שלך.' : data.message || 'הפעולה נכשלה. נסו שוב.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const fetchMyRecipes = (token, signal) => myRecipeRequest('/mine', token, { signal });
export const updateMyRecipe = (id, recipe, token) => myRecipeRequest(`/${id}`, token, { method: 'PATCH', body: JSON.stringify(recipe) });
export const deleteMyRecipe = (id, token) => myRecipeRequest(`/${id}`, token, { method: 'DELETE' });

export async function fetchRecipes() {
  try {
    const response = await fetch(`${BASE_URL}/api/recipes`);
    const data = await response.json();
    console.log('API response:', data);
    return Array.isArray(data) ? data : data.recipes || [];
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }
}

export async function searchRecipes(query) {
  try {
    const response = await fetch(`${BASE_URL}/api/recipes/search?query=${query}`);
    if (!response.ok) throw new Error('Failed to fetch search results');
    return await response.json();
  } catch (error) {
    console.error('Error in searchRecipes:', error);
    return [];
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

    return await response.json();
  } catch (error) {
    console.error('Add recipe error:', error);
    throw error;
  }
};
