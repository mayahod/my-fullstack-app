import { API_BASE } from './config.js';

export async function libraryRequest(path = '', { method = 'GET', body, signal } = {}) {
  const response = await fetch(API_BASE + '/api/library' + path, {
    method,
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message || 'לא ניתן לטעון את האוספים. נסו שוב.');
  return data;
}

export function changeSavedRecipe(collectionId, recipeId, adding) {
  return libraryRequest('/collections/' + collectionId + '/recipes/' + recipeId, {
    method: adding ? 'PUT' : 'DELETE',
  });
}
