"use client";

import { useState } from "react";

import { AnswerForm } from "@/components/app/AnswerForm";
import { ConfidenceBadge } from "@/components/app/ConfidenceBadge";
import { DraftView } from "@/components/app/DraftView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Placement, Task } from "@/types";

interface TaskCardProps {
  task: Task;
  /** Bubbles every mutation up so parent lists / stats stay in sync. */
  onTaskUpdated?: (task: Task) => void;
  /**
   * Called when the user dismisses a suggested task. The card removes itself
   * from view via this callback (Critical Read 3: dismissed = gone from view
   * everywhere); the parent list should drop the id.
   */
  onTaskDismissed?: (taskId: string) => void;
  /**
   * Dev-only — skip every real PATCH against the backend; mutate local state
   * in-place so the `/dev/taskcard` mount is offline. Set automatically by
   * the dev mount; production callers never pass this.
   */
  mockMode?: boolean;
}

/**
 * The most-reused card in the app — used on Meeting Detail, Tasks board,
 * Dashboard preview, and the Calendar day-expansion.
 *
 * Collapsed: assignee · action · ConfidenceBadge · deadline pill. Expanded:
 * a state-dependent body picked by the precedence below (mirrors the brief's
 * task lifecycle):
 *
 *   suggested  → plain details + Promote / Dismiss
 *   drafted    → DraftView + Mark as done
 *   awaiting   → AnswerForm + (form has its own Submit)
 *   answered   → transient spinner "Drafting your action…"
 *   extracted  → plain details + Mark as done (manual route, no handler)
 *
 * `is_done` is the outermost layer: a done task is dimmed and collapses by
 * default. Expanding it shows the same body as if it weren't done, plus an
 * "Un-mark as done" CTA in place of "Mark as done".
 *
 * Local-state model: the card copies `props.task` into useState on mount and
 * mutates it in place on every action. Mutations also call `onTaskUpdated`
 * so parents can sync their lists. Once mounted, the card ignores subsequent
 * prop updates — to force a reset, the parent should pass
 * `key={task.task_id}` so React remounts the card.
 */
export function TaskCard({
  task: initialTask,
  onTaskUpdated,
  onTaskDismissed,
  mockMode = false,
}: TaskCardProps) {
  const [task, setTask] = useState<Task>(initialTask);
  const [expanded, setExpanded] = useState<boolean>(!initialTask.is_done);

  function updateTask(updated: Task) {
    setTask(updated);
    onTaskUpdated?.(updated);
  }

  async function toggleDone() {
    const target = !task.is_done;
    if (mockMode) {
      updateTask({ ...task, is_done: target });
      // Auto-collapse on mark-done to match the brief's "dimmed-and-sunk"
      // affordance; auto-expand on un-mark so the body is visible again.
      setExpanded(!target);
      return;
    }
    const updated = await api.patch<Task>(`/tasks/${task.task_id}/done`, {
      is_done: target,
    });
    updateTask(updated);
    setExpanded(!target);
  }

  async function setPlacement(placement: Placement) {
    if (placement === "dismissed") {
      if (mockMode) {
        onTaskDismissed?.(task.task_id);
        return;
      }
      await api.patch<Task>(`/tasks/${task.task_id}/placement`, { placement });
      onTaskDismissed?.(task.task_id);
      return;
    }
    if (mockMode) {
      updateTask({ ...task, placement });
      return;
    }
    const updated = await api.patch<Task>(`/tasks/${task.task_id}/placement`, {
      placement,
    });
    updateTask(updated);
  }

  const isSuggested = task.placement === "suggested";
  const dimmed = task.is_done;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-line bg-white shadow-soft transition-opacity ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-surface transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {task.assignee}
          </div>
          <div className="mt-1 text-sm text-ink">{task.action}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isSuggested ? (
            <ConfidenceBadge confidence={task.confidence} />
          ) : null}
          <DeadlinePill task={task} />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-line p-4">
          <Body task={task} mockMode={mockMode} onTaskUpdated={updateTask} />
          <CtaRow
            task={task}
            isSuggested={isSuggested}
            onMarkDone={toggleDone}
            onUnmark={toggleDone}
            onPromote={() => setPlacement("main_list")}
            onDismiss={() => setPlacement("dismissed")}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body — picks the right inner content for the current task state
// ---------------------------------------------------------------------------

function Body({
  task,
  mockMode,
  onTaskUpdated,
}: {
  task: Task;
  mockMode: boolean;
  onTaskUpdated: (task: Task) => void;
}) {
  // The mark-done dimmed branch still surfaces the original body so the user
  // can see what they're un-marking.
  if (task.placement === "suggested") {
    return <PlainDetails task={task} />;
  }
  if (task.draft_state === "drafted") {
    return <DraftView task={task} />;
  }
  if (task.draft_state === "awaiting_answers") {
    return (
      <AnswerForm
        task={task}
        mockMode={mockMode}
        onTaskUpdated={onTaskUpdated}
      />
    );
  }
  if (task.draft_state === "answered") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <Spinner />
        <p className="mt-3 text-sm text-ink-muted">Drafting your action…</p>
      </div>
    );
  }
  // `extracted` — manual route, no handler matched.
  return <PlainDetails task={task} />;
}

function PlainDetails({ task }: { task: Task }) {
  return (
    <dl className="space-y-2">
      <div className="flex gap-3 text-sm">
        <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Action
        </dt>
        <dd className="text-ink">{task.action}</dd>
      </div>
      {task.deadline_raw ? (
        <div className="flex gap-3 text-sm">
          <dt className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Deadline
          </dt>
          <dd className="text-ink">{task.deadline_raw}</dd>
        </div>
      ) : null}
      {task.handler === null && task.placement !== "suggested" ? (
        <p className="pt-2 text-xs text-ink-faint">
          No automated handler matched. Mark done when complete.
        </p>
      ) : null}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// CTA row — Promote/Dismiss for suggested, Mark/Un-mark elsewhere
// ---------------------------------------------------------------------------

function CtaRow({
  task,
  isSuggested,
  onMarkDone,
  onUnmark,
  onPromote,
  onDismiss,
}: {
  task: Task;
  isSuggested: boolean;
  onMarkDone: () => void;
  onUnmark: () => void;
  onPromote: () => void;
  onDismiss: () => void;
}) {
  if (isSuggested && !task.is_done) {
    return (
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="primary" size="sm" onClick={onPromote}>
          Promote
        </Button>
      </div>
    );
  }
  if (task.is_done) {
    return (
      <div className="mt-4 flex items-center justify-end">
        <Button variant="secondary" size="sm" onClick={onUnmark}>
          Un-mark as done
        </Button>
      </div>
    );
  }
  // No CTA while waiting for the worker; AnswerForm has its own Submit.
  if (
    task.draft_state === "awaiting_answers" ||
    task.draft_state === "answered"
  ) {
    return null;
  }
  return (
    <div className="mt-4 flex items-center justify-end">
      <Button variant="primary" size="sm" onClick={onMarkDone}>
        Mark as done
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deadline pill — neutral by design. Severity (overdue) is a Phase 9 concern.
// ---------------------------------------------------------------------------

function DeadlinePill({ task }: { task: Task }) {
  if (task.deadline_date) {
    const d = new Date(task.deadline_date);
    const label = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return <Badge tone="neutral">Due {label}</Badge>;
  }
  if (task.deadline_raw) {
    return (
      <span className="text-xs italic text-ink-muted">
        {task.deadline_raw}
      </span>
    );
  }
  return null;
}
