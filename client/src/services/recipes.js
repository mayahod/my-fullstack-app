const BASE_URL = import.meta.env.VITE_API_URL;

export async function fetchRecipes() {
  try {
    const response = await fetch(`${BASE_URL}/api/recipes`);
    const data = await response.json();
    console.log("API response:", data);
    return Array.isArray(data) ? data : data.recipes || [];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}


export async function searchRecipes(query) {
  try {
    const response = await fetch(`${BASE_URL}/api/recipes/search?query=${query}`);
    if (!response.ok) throw new Error("Failed to fetch search results");
    return await response.json();
  } catch (error) {
    console.error("Error in searchRecipes:", error);
    return [];
  }
}
