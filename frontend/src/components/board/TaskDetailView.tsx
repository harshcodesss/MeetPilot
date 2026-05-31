"use client";

import { useEffect, useState } from "react";

import { AnswerForm } from "@/components/app/AnswerForm";
import { DraftView } from "@/components/app/DraftView";
import { ApiError, api } from "@/lib/api";
import type { SourceSegment, Task } from "@/types";

import { ArrowLeftIcon } from "./icons";

interface TaskDetailViewProps {
  task: Task;
  /** Click the top-left back arrow. */
  onBack: () => void;
  /** Echoed up after any mutation (done toggle, answer submit) so the page can rebucket. */
  onTaskUpdated?: (task: Task) => void;
}

/**
 * Full-page task view. Opened from a board card's `…` → Open.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  ← Back to tasks                       [Mark done btn]  │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  TASK TITLE                                              │
 *   │  Meta row: assignee · confidence · deadline · handler   │
 *   │  ── Why this task (cited transcript segments) ──        │
 *   │  ── Draft  /  Answer form  /  Awaiting redraft ──        │
 *   └─────────────────────────────────────────────────────────┘
 *
 * On mount, refetches `/tasks/{id}` to pick up `source_segments` (the list
 * endpoint doesn't carry them). Initial paint uses the task already in
 * memory so the user sees content immediately while the panel populates.
 */
export function TaskDetailView({ task, onBack, onTaskUpdated }: TaskDetailViewProps) {
  const [busy, setBusy] = useState(false);
  const [segments, setSegments] = useState<SourceSegment[] | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    api
      .get<Task>(`/tasks/${task.task_id}`)
      .then((fresh) => {
        if (cancelled) return;
        setSegments(fresh.source_segments ?? []);
        // Push the fresh task (with whatever else has changed) back up — same
        // mutation channel used by the done toggle, so the page rebuckets and
        // the back-button surface stays current.
        onTaskUpdated?.(fresh);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSegmentsError(
          err instanceof ApiError
            ? `Couldn’t load the source transcript (HTTP ${err.status}).`
            : "Couldn’t load the source transcript.",
        );
      });
    return () => {
      cancelled = true;
    };
    // task_id is what drives the refetch; onTaskUpdated is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.task_id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function toggleDone() {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.patch<Task>(`/tasks/${task.task_id}/done`, {
        is_done: !task.is_done,
      });
      onTaskUpdated?.(updated);
    } catch (err) {
      console.error(
        "Failed to toggle done:",
        err instanceof ApiError ? err.message : err,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to tasks
        </button>

        <button
          type="button"
          onClick={toggleDone}
          disabled={busy}
          className={`inline-flex items-center rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
            task.is_done
              ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              : "border-green-600 bg-green-600 text-white hover:bg-green-700"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {task.is_done ? "Mark as undone" : "Mark as done"}
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold leading-snug text-gray-900">
          {task.action}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-gray-600">
          <MetaRow label="Assignee" value={task.assignee || "—"} />
          <MetaRow
            label="Confidence"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${confidenceDotClass(task.confidence)}`}
                />
                {task.confidence}
              </span>
            }
          />
          {task.deadline_raw || task.deadline_date ? (
            <MetaRow
              label="Deadline"
              value={task.deadline_raw || task.deadline_date || "—"}
            />
          ) : null}
          {task.handler ? <MetaRow label="Handler" value={task.handler} /> : null}
          <MetaRow label="Type" value={task.type} />
        </div>

        <WhyThisTask
          segments={segments}
          error={segmentsError}
          sourceSeq={task.source_seq}
        />

        <div className="mt-8 border-t border-gray-200 pt-6">
          {renderBody(task, onTaskUpdated)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Why this task" — the source-transcript panel
// ---------------------------------------------------------------------------

function WhyThisTask({
  segments,
  error,
  sourceSeq,
}: {
  segments: SourceSegment[] | null;
  error: string | null;
  sourceSeq: number[];
}) {
  // Loading
  if (segments === null && !error) {
    return (
      <section className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Why this task
        </h2>
        <p className="mt-2 text-[12px] text-gray-400">
          Loading transcript context…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-md border border-red-200 bg-red-50 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
          Why this task
        </h2>
        <p className="mt-2 text-[12px] text-red-700">{error}</p>
      </section>
    );
  }

  if (!segments || segments.length === 0) {
    // Empty source_seq is plausible for some seeded / weird states — still
    // show the panel so the layout doesn't jump if the panel reappears later.
    return (
      <section className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Why this task
        </h2>
        <p className="mt-2 text-[12px] text-gray-500">
          {sourceSeq.length === 0
            ? "No transcript citations on this task."
            : "Source segments weren’t found — the meeting may have been re-extracted."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Why this task
      </h2>
      <ol className="mt-3 space-y-2">
        {segments.map((seg, i) => {
          const prev = i > 0 ? segments[i - 1]!.seq : null;
          const hasGap = prev !== null && seg.seq - prev > 1;
          return (
            <li key={seg.seq} className="text-[13px]">
              {hasGap ? (
                <div className="my-2 select-none text-center text-[11px] text-gray-300">
                  — — —
                </div>
              ) : null}
              <span className="font-medium text-gray-700">{seg.speaker}:</span>{" "}
              <span className="text-gray-800">{seg.text}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Body switch + small helpers
// ---------------------------------------------------------------------------

function renderBody(task: Task, onTaskUpdated?: (t: Task) => void) {
  if (task.draft_state === "drafted") {
    return <DraftView task={task} />;
  }
  if (task.draft_state === "awaiting_answers") {
    return <AnswerForm task={task} onTaskUpdated={onTaskUpdated} />;
  }
  if (task.draft_state === "answered") {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-[13px] text-gray-700">
        Your answers were submitted — waiting for the draft to come back.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-[13px] text-gray-700">
      No draft yet for this task.
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium text-gray-500">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </span>
  );
}

function confidenceDotClass(confidence: string): string {
  switch (confidence) {
    case "high":
      return "bg-green-500";
    case "moderate":
      return "bg-yellow-500";
    case "low":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}
