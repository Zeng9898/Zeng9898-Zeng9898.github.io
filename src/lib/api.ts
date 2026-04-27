export const API_BASE = (
  import.meta.env.VITE_API_BASE ??
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://8935-140-115-126-37.ngrok-free.app')
).replace(/\/$/, '');

export const AUTH_STORAGE_KEY = 'scientific_argumentation_auth';
const IS_NGROK_HOST = /(?:^https?:\/\/)?[^/]*ngrok-free\.app$/i.test(API_BASE);

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

export function buildApiHeaders(token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(IS_NGROK_HOST ? { 'ngrok-skip-browser-warning': '1' } : {}),
    ...buildAuthHeaders(token),
  };
}
