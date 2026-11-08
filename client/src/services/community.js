import { API_BASE } from './config';

export async function communityRequest(path, { token, signal, method = 'GET' } = {}) {
  const response = await fetch(`${API_BASE}/api/community${path}`, {
    method,
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.message || 'לא ניתן לטעון את הקהילה כרגע. נסו שוב.');
  }
  return data;
}
