const BASE_URL = import.meta.env.VITE_API_URL;

export async function fetchRecipes() {
  const response = await fetch(`${BASE_URL}/recipes`);
  const data = await response.json();
  return data.recipes;
}
