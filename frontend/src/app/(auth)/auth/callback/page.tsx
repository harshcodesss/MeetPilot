"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { setToken } from "@/lib/auth";

/**
 * OAuth callback landing page.
 *
 * The backend redirects here with `?token=<bearer>` on success. Three
 * observable outcomes (Critical Read 7):
 *   - `?token=...` → store token, strip the query string, route to /dashboard.
 *   - `?error=...` → friendly error + Try again.
 *   - empty / malformed → same fallback as ?error. No silent redirect — user
 *     should see why they didn't get in.
 *
 * `useSearchParams` requires a Suspense boundary in App Router; the page
 * exports the boundary and the inner component does the work.
 */
function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    if (!token) return;
    setToken(token);
    // Strip the token from the URL bar before the route change so it doesn't
    // sit in browser history or leak into Referer headers.
    window.history.replaceState({}, "", "/auth/callback");
    router.replace("/dashboard");
  }, [token, router]);

  if (token) {
    return (
      <Card className="w-full max-w-sm text-center">
        <Spinner />
        <p className="mt-4 text-sm text-ink-muted">Completing sign-in…</p>
      </Card>
    );
  }

  const errorMsg = friendlyError(error);
  return (
    <Card className="w-full max-w-sm text-center">
      <h1 className="text-xl font-semibold text-ink">Sign-in failed</h1>
      <p className="mt-2 text-sm text-ink-muted">{errorMsg}</p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
      >
        Try again
      </Link>
    </Card>
  );
}

/**
 * Maps backend error codes to user-facing copy. The backend sends short
 * codes (e.g. `access_denied`, `sign_in_failed`); known ones get friendly
 * text, anything unknown falls back to a generic message — never echo a
 * raw code to the user.
 */
function friendlyError(code: string | null): string {
  switch (code) {
    case "access_denied":
      return "You declined to grant access. Sign in again to continue.";
    case "sign_in_failed":
      return "Sign-in didn’t complete. Please try again.";
    case null:
      return "Sign-in didn’t complete. Please try again.";
    default:
      return "Sign-in didn’t complete. Please try again.";
  }
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-sm text-center">
          <Spinner />
          <p className="mt-4 text-sm text-ink-muted">Loading…</p>
        </Card>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
