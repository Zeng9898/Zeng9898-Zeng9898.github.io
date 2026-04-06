export const API_BASE = (
  import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')
).replace(/\/$/, '');

export const AUTH_STORAGE_KEY = 'scientific_argumentation_auth';

export type ApiAuthState = {
  token: string;
};

export function getStoredAuth(): ApiAuthState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ApiAuthState;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildAuthHeaders(token?: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
