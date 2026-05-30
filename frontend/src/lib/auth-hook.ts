"use client";

import { useSyncExternalStore } from "react";

import { TOKEN_EVENT, TOKEN_STORAGE_KEY } from "./auth";

/**
 * Reactive bearer-token read. Returns `null` during SSR and on first paint;
 * components that gate on auth (AuthGuard) re-render once the client snapshot
 * resolves. Subscribes to both cross-tab `storage` and our same-tab
 * `meetpilot:token` event so set/clear from anywhere triggers a refresh.
 *
 * Lives in its own file (with `"use client"`) so the storage helpers in
 * `auth.ts` stay safely importable from server components.
 */
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(TOKEN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TOKEN_EVENT, callback);
  };
}

function getClientSnapshot() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
