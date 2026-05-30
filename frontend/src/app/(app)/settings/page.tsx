"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ExtensionConnect } from "@/components/app/ExtensionConnect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { clearToken } from "@/lib/auth";

/**
 * Settings — account info, extension connect (reused from Dashboard), sign-out.
 *
 * V1 surface only: no timezone, no notifications, no theme. The brief locked
 * those as explicit future scope. This page is intentionally minimal — the
 * Google identity is the source of truth, MeetPilot doesn't store anything
 * users would want to "configure" yet.
 */

interface UserOut {
  user_id: string;
  email: string;
  display_name: string;
}

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  user: UserOut;
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function SettingsPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    api
      .get<UserOut>("/me")
      .then((user) => {
        if (cancelled) return;
        setPageState({ status: "loaded", user });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPageState({ status: "error", message: errorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function onSignOut() {
    setSigningOut(true);
    try {
      // Best-effort logout — even if the server call fails (token already
      // revoked, server down, etc.) we still clear the local token and
      // bounce to /login so the user isn't stuck.
      await api.post("/auth/logout").catch(() => {});
    } finally {
      clearToken();
      router.replace("/login");
    }
  }

  if (pageState.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="text-center">
          <h1 className="text-lg font-semibold text-ink">
            Couldn’t load your settings
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  const { user } = pageState;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Settings
      </h1>

      <Card>
        <h2 className="text-base font-medium text-ink">Account</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in with Google. To change your account, sign out and sign in
          again.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Name
            </dt>
            <dd className="text-ink">{user.display_name}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Email
            </dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <ExtensionConnect />

      <Card>
        <h2 className="text-base font-medium text-ink">Sign out</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Ends this browser session. Your captured meetings stay in your
          account — sign in again to see them.
        </p>
        <div className="mt-4">
          <Button
            variant="danger"
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load your account (HTTP ${err.status}).`;
  }
  return "Couldn’t load your account. Please check your connection.";
}
