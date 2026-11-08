import { API_BASE } from './config.js';

export async function libraryRequest(token, path = '', { method = 'GET', body, signal } = {}) {
  const response = await fetch(API_BASE + '/api/library' + path, {
    method,
    signal,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message || 'לא ניתן לטעון את האוספים. נסו שוב.');
  return data;
}

export function changeSavedRecipe(token, collectionId, recipeId, adding) {
  return libraryRequest(token, '/collections/' + collectionId + '/recipes/' + recipeId, {
    method: adding ? 'PUT' : 'DELETE',
  });
}
