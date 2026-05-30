"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { useAuthToken } from "@/lib/auth-hook";

/**
 * Client-side auth gate for the `(app)` route group.
 *
 * `useAuthToken` is a useSyncExternalStore subscription against localStorage,
 * so the server snapshot is always `null` (no window) and the client snapshot
 * is the real bearer (or `null` if unauthenticated). React handles the SSR →
 * hydration handoff for us.
 *
 * No bearer → redirect to /login. The redirect is a pure side effect, so it
 * goes in useEffect. While the redirect is in flight (or during the
 * briefest spinner flash on first paint) we render the spinner.
 *
 * The proper fix for the flash is httpOnly cookies + Next middleware, which
 * is a Postgres-era upgrade.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthToken();
  const router = useRouter();

  useEffect(() => {
    if (token === null) router.replace("/login");
  }, [token, router]);

  if (token === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
