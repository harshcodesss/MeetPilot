"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ExtensionConnect } from "@/components/app/ExtensionConnect";
import { MeetingCard } from "@/components/app/MeetingCard";
import { StatCard } from "@/components/app/StatCard";
import { TaskCard } from "@/components/app/TaskCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Session, Stats, Task } from "@/types";

/**
 * The demoable checkpoint — after this page renders, the product is fully
 * navigable end-to-end. Layout follows the brief's locked wireframe:
 *
 *   [Stats x 4] — one StatCard per /me/stats counter; Action Required is
 *                 the "attention" semantic (yellow), per the brief.
 *   [Recent meetings] — top 5 sessions (slice client-side from /me/sessions).
 *   [Tasks preview] [Extension card] — bottom row, 2/3 + 1/3 split on lg+.
 *
 * Three parallel fetches via `Promise.all`. All-or-nothing on the load (a
 * failure on any surfaces the page-level error). Mirrors the Meeting Detail
 * (Phase 4) and Meetings list (Phase 5) pattern.
 *
 * Dashboard is a SNAPSHOT, not a live view. Stats are computed at page-load
 * and stay frozen until the next reload — marking a task done on this page
 * dims the card locally but does NOT refetch /me/stats. Rationale: stats
 * are glanceable, not load-bearing; the authoritative state lives on
 * /tasks (Phase 7).
 */

const RECENT_MEETINGS_LIMIT = 5;
const TASK_PREVIEW_LIMIT = 5;

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  stats: Stats;
  sessions: Session[];
  tasks: Task[];
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function DashboardPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  // Data-fetch-on-mount setState pattern; React 19's lint rule is overzealous.
  // Same disable as Phase 4/5 — if a third or fourth surface accumulates we
  // switch to SWR / TanStack Query.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    void Promise.all([
      api.get<Stats>("/me/stats"),
      api.get<Session[]>("/me/sessions"),
      api.get<Task[]>("/me/tasks?bucket=drafted"),
    ])
      .then(([stats, sessions, tasks]) => {
        if (cancelled) return;
        setPageState({
          status: "loaded",
          stats,
          sessions: sessions.slice(0, RECENT_MEETINGS_LIMIT),
          tasks: tasks.slice(0, TASK_PREVIEW_LIMIT),
        });
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
            Couldn’t load your dashboard
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  const { stats, sessions, tasks } = pageState;
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Dashboard
      </h1>

      <StatsRow stats={stats} />

      <RecentMeetings sessions={sessions} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <TasksPreview tasks={tasks} />
        <aside className="lg:col-span-1">
          <ExtensionConnect />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections — local to this page
// ---------------------------------------------------------------------------

function StatsRow({ stats }: { stats: Stats }) {
  const windowHint = `last ${stats.window_days} days`;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Meetings"
        value={stats.meetings_this_week}
        hint={windowHint}
      />
      <StatCard
        label="Tasks"
        value={stats.tasks_this_week}
        hint={windowHint}
      />
      <StatCard label="Drafts Ready" value={stats.drafts_ready} />
      <StatCard
        label="Action Required"
        value={stats.action_required}
        prominent
      />
    </div>
  );
}

function RecentMeetings({ sessions }: { sessions: Session[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Recent meetings
        </h2>
        <Link
          href="/meetings"
          className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          See all →
        </Link>
      </div>
      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No meetings captured yet. Install the extension to start.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <MeetingCard key={s.session_id} session={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function TasksPreview({ tasks }: { tasks: Task[] }) {
  return (
    <section className="lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Drafts ready
        </h2>
        <Link
          href="/tasks"
          className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          See all →
        </Link>
      </div>
      {tasks.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No drafted actions yet. Capture a meeting to see action items here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard key={t.task_id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load the dashboard (HTTP ${err.status}).`;
  }
  return "Couldn’t load the dashboard. Please check your connection.";
}
