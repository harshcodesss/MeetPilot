"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MeetingCard } from "@/components/app/MeetingCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Session } from "@/types";

/**
 * Meetings list — every session the user owns, newest first. Reuses the
 * `MeetingCard` already verified on the dev mount; each card click routes
 * into `/meetings/[id]` (Phase 4).
 *
 * Backend returns sessions sorted by `started_at DESC` and includes the
 * `drafts_ready_count` / `awaiting_count` per row (Phase 0.6), so the badges
 * render without N+1 calls.
 *
 * Empty state points at the Dashboard's Extension Download card. The
 * download card itself lands in Phase 6; the /dashboard placeholder is
 * adequate as a target until then.
 */

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  sessions: Session[];
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function MeetingsPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  // Data-fetch-on-mount is the canonical setState-in-effect case; React 19's
  // lint rule is overzealous here. Mirrors the same disable + comment as
  // Meeting Detail (Phase 4) — SWR / TanStack Query is the long-term move
  // if we accumulate more of these.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    api
      .get<Session[]>("/me/sessions")
      .then((sessions) => {
        if (cancelled) return;
        setPageState({ status: "loaded", sessions });
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
            Couldn’t load your meetings
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Header count={pageState.sessions.length} />

      {pageState.sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageState.sessions.map((s) => (
            <MeetingCard key={s.session_id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — local to the page
// ---------------------------------------------------------------------------

function Header({ count }: { count: number }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Meetings
      </h1>
      {count > 0 ? (
        <p className="mt-1 text-sm text-ink-muted">
          {count} {count === 1 ? "meeting" : "meetings"}, newest first.
        </p>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mt-8 text-center">
      <h2 className="text-base font-medium text-ink">
        No meetings captured yet
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Install the extension and start your first capture to see it here.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
      >
        Go to Dashboard
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load your meetings (HTTP ${err.status}).`;
  }
  return "Couldn’t load your meetings. Please check your connection.";
}
