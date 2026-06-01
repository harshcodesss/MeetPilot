"use client";

import { Pencil } from "lucide-react";
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
    <div className="space-y-10 px-2">
      <div className="border-b border-line pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Settings
        </h1>
      </div>

      {/* Account — Google identity, read-only. Each field is its own row,
          separated by a hairline; the (disabled) Edit affordance is visual
          only, since identity is owned by Google. */}
      <section>
        <SectionHeading
          title="Account"
          subtitle="Your Google identity. MeetPilot reads these from sign-in — to change them, update your Google account."
        />
        <div className="mt-4 divide-y divide-line border-t border-line">
          <FieldRow label="Name" value={user.display_name} />
          <FieldRow label="Email" value={user.email} />
        </div>
      </section>

      {/* Browser extension — reused connect card (its own self-contained UI). */}
      <section>
        <SectionHeading
          title="Browser extension"
          subtitle="Connect the Chrome extension to start capturing your meetings."
        />
        <div className="mt-4">
          <ExtensionConnect showHeading={false} />
        </div>
      </section>

      {/* Sign out */}
      <section>
        <SectionHeading
          title="Sign out"
          subtitle="Ends this browser session. Your captured meetings stay in your account — sign in again to see them."
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — local to the page
// ---------------------------------------------------------------------------

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </div>
        <div className="mt-1 break-all text-sm text-ink">{value}</div>
      </div>
      {/* Disabled by design — identity is managed by Google, so this is a
          visual affordance only (no edit flow in v1). */}
      <Button
        variant="secondary"
        size="sm"
        disabled
        title="Managed by your Google account"
        className="rounded-md"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        Edit
      </Button>
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
