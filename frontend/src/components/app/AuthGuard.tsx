"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { isAuthed } from "@/lib/auth";
import { useAuthToken } from "@/lib/auth-hook";

/**
 * Client-side auth gate for the `(app)` route group.
 *
 * Subtle hydration-timing rule baked in here: `useAuthToken` is a
 * `useSyncExternalStore` subscription, which is REQUIRED to return the
 * server snapshot (`null`) on the first client render to match the SSR
 * pass. The real client snapshot (localStorage) only kicks in on the
 * second render. If the effect trusted the captured `token` value during
 * that first render, every hard-URL navigation to an (app) page would
 * redirect authed users to /login before the client snapshot settled.
 *
 * So inside the effect we read localStorage FRESH via `isAuthed()`. The
 * captured `token` is only used as a dependency so the effect re-runs on
 * cross-tab token changes (e.g. logout in another tab → bounce here too).
 *
 * The JSX still gates on `token === null` for the spinner; that's fine —
 * the spinner is the correct UX while the client snapshot is settling.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthToken();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthed()) router.replace("/login");
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
