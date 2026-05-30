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
      <Card className="text-center">
        <Spinner />
        <p className="mt-4 text-sm text-surface-500">Completing sign-in…</p>
      </Card>
    );
  }

  const errorMsg = error ?? "Sign-in did not complete. Please try again.";
  return (
    <Card className="text-center">
      <h1 className="text-xl font-semibold text-surface-900">Sign-in failed</h1>
      <p className="mt-2 text-sm text-surface-500">{errorMsg}</p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        Try again
      </Link>
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className="text-center">
          <Spinner />
          <p className="mt-4 text-sm text-surface-500">Loading…</p>
        </Card>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
