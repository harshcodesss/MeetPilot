/**
 * Auth token storage helpers.
 *
 * Backend issues an opaque 32-byte hex bearer (`AuthSession.token`) on Google
 * sign-in. The web app stores it in `localStorage` and sends it as
 * `Authorization: Bearer <token>` on every API call.
 *
 * localStorage is the v1 choice over cookies because: (1) the same bearer
 * lives in `chrome.storage.local` on the extension side, so the storage
 * model already isn't cookie-based; (2) the extension's cross-origin fetches
 * can't use cookies anyway; (3) keeping storage symmetric keeps the
 * connect-token handoff (Phase 8) trivial. httpOnly cookies become an option
 * later when there's a real production deploy + CSRF threat model.
 *
 * Plain helpers here — no React, no `"use client"` — so they can be imported
 * from server components too (where they safely no-op). The reactive hook
 * `useAuthToken` lives in `auth-hook.ts` so importing it doesn't pull React
 * client-only APIs into server-component graphs.
 */

const TOKEN_KEY = "meetpilot_token";
/** Same-tab token-change pulse — see setToken / clearToken comments below. */
export const TOKEN_EVENT = "meetpilot:token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  // Same-tab listeners (e.g. useAuthToken's useSyncExternalStore) don't fire
  // `storage` events naturally — those only fire cross-tab. Dispatch one
  // ourselves so token-subscribed components re-read immediately.
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function isAuthed(): boolean {
  return getToken() !== null;
}

/** Storage-key constant exported for the hook in auth-hook.ts. */
export const TOKEN_STORAGE_KEY = TOKEN_KEY;
