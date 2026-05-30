"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { TaskCard } from "@/components/app/TaskCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Segment, SessionDetail, Task } from "@/types";

/**
 * The single most-valuable page in the app — closes Subsystem 4's outstanding
 * "real meeting closing gate." A captured meeting → its tasks (split into
 * Main + Suggested) → expand a vague task → fill answers → watch the worker
 * draft, all rendered against real backend reads for the first time.
 *
 * Two parallel fetches on mount: `/me/sessions/{id}` (metadata + tasks) and
 * `/me/sessions/{id}/transcript`. The page can't render without metadata, so
 * a failure in either flips the whole page to the error state.
 *
 * Auth: localStorage bearer flows through `api.ts`. 401 is centrally handled
 * in the fetch wrapper (clear token + bounce to /login). 404 / 403 / other
 * surface as friendly messages here.
 *
 * Layout: two columns on lg+ — tasks on the left, sticky transcript on the
 * right (its own scroll, so it stays visible while task lists are long).
 * Stacks on small screens.
 */

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  detail: SessionDetail;
  segments: Segment[];
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  // Tasks live in their own state slice so TaskCard mutations (mark-done,
  // promote, dismiss, AnswerForm polling) can update them in place without
  // overwriting the rest of the loaded data.
  const [tasks, setTasks] = useState<Task[]>([]);

  // Data-fetch-on-mount is the canonical use case for setState-in-effect;
  // React 19's lint rule is overzealous here. Disabling for this block —
  // SWR / TanStack Query would be the longer-term substitute if we end up
  // with many of these.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    void Promise.all([
      api.get<SessionDetail>(`/me/sessions/${sessionId}`),
      api.get<Segment[]>(`/me/sessions/${sessionId}/transcript`),
    ])
      .then(([detail, segments]) => {
        if (cancelled) return;
        setPageState({ status: "loaded", detail, segments });
        setTasks(detail.tasks);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPageState({ status: "error", message: errorMessage(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { mainTasks, suggestedTasks } = useMemo(() => {
    const main: Task[] = [];
    const suggested: Task[] = [];
    for (const t of tasks) {
      if (t.placement === "suggested") suggested.push(t);
      else main.push(t); // dismissed already filtered server-side
    }
    return { mainTasks: main, suggestedTasks: suggested };
  }, [tasks]);

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.task_id === updated.task_id ? updated : t)),
    );
  }
  function handleTaskDismissed(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
  }

  // Deep-link scroll target: Calendar (Phase 9) and other surfaces link here
  // with `#task-<task_id>`. After tasks render, scroll to the anchored card.
  // The dependency on tasks.length ensures we wait until the DOM has the
  // `<div id="task-...">` wrappers before searching.
  useEffect(() => {
    if (pageState.status !== "loaded") return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    // task IDs are UUIDs (hex + hyphens) so we can use the hash directly
    // as a CSS selector with no escaping needed.
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pageState.status, tasks.length]);

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
            Couldn’t load this meeting
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
          <Link
            href="/meetings"
            className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Back to Meetings
          </Link>
        </Card>
      </div>
    );
  }

  const { detail, segments } = pageState;
  const hasNoTasks = mainTasks.length === 0 && suggestedTasks.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <MeetingHeader session={detail.session} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {hasNoTasks ? (
            <Card className="text-center">
              <p className="text-sm text-ink-muted">
                No actions extracted from this meeting.
              </p>
            </Card>
          ) : null}

          <TasksSection
            title="Main"
            tasks={mainTasks}
            onTaskUpdated={handleTaskUpdated}
            onTaskDismissed={handleTaskDismissed}
          />
          <TasksSection
            title="Suggested"
            tasks={suggestedTasks}
            onTaskUpdated={handleTaskUpdated}
            onTaskDismissed={handleTaskDismissed}
          />
        </div>

        <Transcript segments={segments} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — kept local to the page; not reused elsewhere.
// ---------------------------------------------------------------------------

function MeetingHeader({ session }: { session: SessionDetail["session"] }) {
  return (
    <div>
      <Link
        href="/meetings"
        className="text-xs font-medium uppercase tracking-wide text-ink-muted hover:text-ink transition-colors"
      >
        ← Meetings
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {session.title ?? "Untitled meeting"}
        </h1>
        <Badge tone={session.status === "active" ? "info" : "neutral"}>
          {session.status}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <span>{formatDateTime(session.started_at)}</span>
        <span aria-hidden>·</span>
        <span>{session.segment_count} segments</span>
        <span aria-hidden>·</span>
        <span>
          {session.task_count} {pluralise("task", session.task_count)}
        </span>
      </div>
    </div>
  );
}

function TasksSection({
  title,
  tasks,
  onTaskUpdated,
  onTaskDismissed,
}: {
  title: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDismissed: (taskId: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title} ({tasks.length})
      </h2>
      <div className="space-y-3">
        {tasks.map((t) => (
          // Deep-link target — Calendar's task rows link here with
          // `/meetings/<sid>#task-<tid>`. `scroll-mt-8` adds breathing
          // room above the anchored card after scrollIntoView lands.
          <div
            key={t.task_id}
            id={`task-${t.task_id}`}
            className="scroll-mt-8"
          >
            <TaskCard
              task={t}
              onTaskUpdated={onTaskUpdated}
              onTaskDismissed={onTaskDismissed}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Transcript({ segments }: { segments: Segment[] }) {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-xl border border-line bg-white shadow-soft">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Transcript ({segments.length})
          </h2>
        </div>
        <div className="lg:max-h-[calc(100vh-10rem)] overflow-y-auto p-4">
          {segments.length === 0 ? (
            <p className="text-sm text-ink-muted">Transcript not available.</p>
          ) : (
            <ol className="space-y-3">
              {segments.map((s) => (
                <li key={s.seq} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-ink">{s.speaker}</span>
                    <span className="text-xs text-ink-faint">
                      {formatTime(s.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-ink-muted">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404)
      return "We couldn’t find this meeting. It may have been deleted.";
    if (err.status === 403)
      return "You don’t have access to this meeting.";
    return `Couldn’t load this meeting (HTTP ${err.status}).`;
  }
  return "Couldn’t load this meeting. Please check your connection.";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function pluralise(word: string, n: number): string {
  return n === 1 ? word : `${word}s`;
}
