import { API_BASE } from './config';

export async function communityRequest(path, { signal, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}/api/community${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.message || 'לא ניתן לטעון את הקהילה כרגע. נסו שוב.');
  }
  return data;
}
