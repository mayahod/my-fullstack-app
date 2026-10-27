// Use the same host as the page, including on phones and hosted deployments.
export const API_BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');
