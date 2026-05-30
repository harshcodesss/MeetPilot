"use client";

import { useEffect, useMemo, useState } from "react";

import { TaskCard } from "@/components/app/TaskCard";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { type Bucket, bucketTasks } from "@/lib/buckets";
import type { Task } from "@/types";

/**
 * Cross-meeting Tasks board — four columns (Ready to Use / Needs Your Input
 * / Suggestions / Done) fed by a single `/me/tasks` fetch and bucketed
 * client-side. Bucketing precedence is locked in `lib/buckets.ts`.
 *
 * Mutations re-bucket in place — TaskCard's `onTaskUpdated` callback updates
 * the page's task list, the `useMemo(bucketTasks)` re-runs, React unmounts
 * the card from its old column and remounts it in the new one. Same flow
 * for promotion (suggested → main list re-buckets by draft_state). Dismiss
 * removes the card entirely via `onTaskDismissed`.
 *
 * Layout: horizontal scroll on narrow (fixed-width columns), four equal
 * columns on lg+. Each column header carries an `(N)` count badge when
 * non-zero — suppressed on empty for cleaner look (Phase 7 option 3).
 */

const COLUMN_CONFIG: Array<{ key: Bucket; label: string; empty: string }> = [
  { key: "drafted", label: "Ready to Use", empty: "Nothing drafted yet." },
  {
    key: "awaiting",
    label: "Needs Your Input",
    empty: "No clarifications waiting.",
  },
  {
    key: "suggested",
    label: "Suggestions",
    empty: "No suggestions to review.",
  },
  { key: "done", label: "Done", empty: "Nothing finished yet." },
];

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function TasksPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [tasks, setTasks] = useState<Task[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    api
      .get<Task[]>("/me/tasks")
      .then((fetched) => {
        if (cancelled) return;
        setTasks(fetched);
        setPageState({ status: "loaded" });
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

  const buckets = useMemo(() => bucketTasks(tasks), [tasks]);

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.task_id === updated.task_id ? updated : t)),
    );
  }
  function handleTaskDismissed(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
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
            Couldn’t load your tasks
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Tasks</h1>

      <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {COLUMN_CONFIG.map((col) => {
          const colTasks = buckets[col.key];
          return (
            <Column
              key={col.key}
              label={col.label}
              empty={col.empty}
              tasks={colTasks}
              onTaskUpdated={handleTaskUpdated}
              onTaskDismissed={handleTaskDismissed}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function Column({
  label,
  empty,
  tasks,
  onTaskUpdated,
  onTaskDismissed,
}: {
  label: string;
  empty: string;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDismissed: (taskId: string) => void;
}) {
  return (
    <div className="w-72 shrink-0 lg:w-auto">
      <header className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </h2>
        {tasks.length > 0 ? (
          <span className="text-xs text-ink-faint">({tasks.length})</span>
        ) : null}
      </header>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card variant="flat">
            <p className="text-sm text-ink-faint">{empty}</p>
          </Card>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.task_id}
              task={t}
              onTaskUpdated={onTaskUpdated}
              onTaskDismissed={onTaskDismissed}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load your tasks (HTTP ${err.status}).`;
  }
  return "Couldn’t load your tasks. Please check your connection.";
}
