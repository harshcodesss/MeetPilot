"use client";

import { Lock, LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { clearToken } from "@/lib/auth";

/**
 * Settings — account info + sign-out.
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
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage your account and session.
        </p>
      </header>

      {/* Profile — avatar + identity, then the read-only Google fields
          (identity is owned by Google, so these aren't editable here). */}
      <Card>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-xl font-semibold text-white">
            {initials(user.display_name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-ink">
                {user.display_name}
              </h2>
              <GoogleBadge />
            </div>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-line border-t border-line">
          <FieldRow label="Name" value={user.display_name} Icon={User} />
          <FieldRow label="Email" value={user.email} Icon={Mail} />
        </div>
      </Card>

      {/* Session — sign out, set apart with a red accent. */}
      <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-bg text-red">
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Sign out</h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              Ends this browser session. Your meetings stay in your account.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — local to the page
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof User;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-muted">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            {label}
          </div>
          <div className="mt-0.5 break-all text-sm font-medium text-ink">
            {value}
          </div>
        </div>
      </div>
      {/* Identity is managed by Google — read-only here. */}
      <span
        title="Managed by your Google account"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-faint"
      >
        <Lock className="h-3 w-3" strokeWidth={2} />
        Managed by Google
      </span>
    </div>
  );
}

// Small "Signed in with Google" pill shown next to the display name.
function GoogleBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-muted">
      <GoogleMark />
      Google
    </span>
  );
}

function GoogleMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

// First letters of up to two name parts, e.g. "Harsh Rathi" → "HR".
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
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
