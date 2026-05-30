/**
 * Typed fetch wrapper for the MeetPilot backend.
 *
 * Single entry point so every call shares the same bearer-attach + 401
 * handling + base-URL config. Pages and components import `api.get(...)` /
 * `api.patch(...)` etc. and never touch `fetch` directly.
 *
 * 401 handling is centralised here (Phase 1 plan): on any 401 we clear the
 * stored token and bounce to `/login`. Covers the case where the bearer was
 * revoked server-side mid-session — the user shouldn't see a half-loaded
 * page with broken data, they should land on Sign In and start fresh.
 */

import { clearToken, getToken } from "./auth";

/**
 * Backend origin. v1 is local-only — `NEXT_PUBLIC_API_BASE_URL` lets the
 * production deploy point at a different host without code changes.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Thrown by every helper below when the response is non-2xx. Pages can
 * catch this to render an error state; bubble to the boundary otherwise.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOpts {
  /** If true, do not attach the bearer (for public endpoints — currently none). */
  unauthenticated?: boolean;
  /** Custom Headers merged on top of the defaults. */
  headers?: Record<string, string>;
  /** Custom AbortSignal — used by polling loops to cancel inflight requests. */
  signal?: AbortSignal;
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  opts: RequestOpts = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  if (!opts.unauthenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: opts.signal,
  });

  if (res.status === 401) {
    // Bearer is invalid or revoked. Bounce to login from any page.
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, null, "Unauthorized — redirecting to login");
  }

  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      // body wasn't JSON; that's fine, ApiError still carries status
    }
    throw new ApiError(res.status, parsed, `HTTP ${res.status} on ${path}`);
  }

  // 204 No Content — return undefined cast as T (caller's responsibility)
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOpts) =>
    request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: RequestOpts) =>
    request<T>("DELETE", path, undefined, opts),
};
