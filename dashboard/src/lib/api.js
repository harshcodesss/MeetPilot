/**
 * API client for the MeetPilot backend.
 * Token-paste auth — mirrors the extension's pattern.
 */

const BACKEND_URL = "http://localhost:8000";
const TOKEN_KEY = "mp_token";

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiGet(path) {
  const token = getToken();
  if (!token) {
    throw new AuthError("no token");
  }
  const res = await fetch(BACKEND_URL + path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    throw new AuthError("unauthorized");
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
