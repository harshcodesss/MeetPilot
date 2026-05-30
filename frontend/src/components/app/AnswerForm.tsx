"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Task } from "@/types";

const POLL_INTERVAL_MS = 1500;
const POLL_CEILING_MS = 60_000;
const PROMPT_LENGTH_FOR_TEXTAREA = 60;

interface AnswerFormProps {
  task: Task;
  /**
   * Optional — called when polling sees `draft_state === 'drafted'`. Parent
   * (TaskCard) uses this to swap the form out for the DraftView. If omitted,
   * the form simply stays on the polling spinner until the ceiling hits.
   */
  onTaskUpdated?: (task: Task) => void;
  /**
   * Dev-only flag for the `/dev/taskcard` mount: skip the real POST + poll
   * chain so the test page is offline. The form still transitions through
   * its visual phases (filling → submitting → polling) so we can eye the
   * states; it just never resolves on its own.
   */
  mockMode?: boolean;
}

type Phase =
  | { status: "filling" }
  | { status: "submitting" }
  | { status: "polling"; startedAt: number }
  | { status: "timed_out" }
  | { status: "error"; message: string };

/**
 * Renders the clarification questions as labeled inputs (hint shown as helper
 * text), submits filled answers, and polls the single-task endpoint until the
 * worker flips `draft_state` to `drafted`.
 *
 * Partial answers are allowed (Critical Read 1 + backend semantics): we send
 * only the non-empty fields and let the prompt's three-way rendering handle
 * missing ones. The submit button stays enabled regardless of how many
 * questions are filled.
 *
 * Poll cadence: 1500 ms with a 60 s ceiling. On ceiling we show a friendly
 * "taking longer than expected" message + a Check again CTA that fires a
 * single GET; we never silently stop polling without telling the user.
 */
export function AnswerForm({ task, onTaskUpdated, mockMode = false }: AnswerFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>({ status: "filling" });
  // AbortController for the in-flight fetch (POST or GET). Re-minted before
  // each call and aborted on unmount so a navigation away during polling
  // doesn't keep firing requests.
  const abortRef = useRef<AbortController | null>(null);
  // The setTimeout handle for the next scheduled poll; cleared on unmount.
  const pollHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (pollHandleRef.current) clearTimeout(pollHandleRef.current);
    };
  }, []);

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mockMode) {
      // Skip HTTP. Transition into "submitting" briefly, then "polling" and
      // stay there — the test page only needs to verify the visuals.
      setPhase({ status: "submitting" });
      setTimeout(() => {
        setPhase({ status: "polling", startedAt: Date.now() });
      }, 400);
      return;
    }

    void submitAndPoll();
  }

  async function submitAndPoll() {
    setPhase({ status: "submitting" });
    abortRef.current = new AbortController();

    // Only send non-empty answers — backend accepts partial answers.
    const filtered = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.trim().length > 0),
    );

    try {
      await api.post(
        `/tasks/${task.task_id}/answers`,
        { answers: filtered },
        { signal: abortRef.current.signal },
      );
    } catch (err) {
      if (isAbort(err)) return;
      setPhase({
        status: "error",
        message: err instanceof ApiError
          ? `Couldn’t submit: ${err.message}`
          : "Couldn’t submit. Please try again.",
      });
      return;
    }

    const startedAt = Date.now();
    setPhase({ status: "polling", startedAt });
    schedulePoll(startedAt);
  }

  function schedulePoll(startedAt: number) {
    pollHandleRef.current = setTimeout(() => {
      void pollOnce(startedAt);
    }, POLL_INTERVAL_MS);
  }

  async function pollOnce(startedAt: number) {
    if (Date.now() - startedAt > POLL_CEILING_MS) {
      setPhase({ status: "timed_out" });
      return;
    }
    abortRef.current = new AbortController();
    try {
      const updated = await api.get<Task>(
        `/tasks/${task.task_id}`,
        { signal: abortRef.current.signal },
      );
      if (updated.draft_state === "drafted") {
        onTaskUpdated?.(updated);
        // Parent should swap us out; we deliberately leave the phase as
        // 'polling' so the spinner stays up if the parent doesn't unmount.
        return;
      }
      schedulePoll(startedAt);
    } catch (err) {
      if (isAbort(err)) return;
      // Transient errors — keep polling. The ceiling will still cap us.
      schedulePoll(startedAt);
    }
  }

  async function onCheckAgain() {
    abortRef.current = new AbortController();
    try {
      const updated = await api.get<Task>(
        `/tasks/${task.task_id}`,
        { signal: abortRef.current.signal },
      );
      if (updated.draft_state === "drafted") {
        onTaskUpdated?.(updated);
        return;
      }
      // Still not drafted — restart the polling window from now.
      const startedAt = Date.now();
      setPhase({ status: "polling", startedAt });
      schedulePoll(startedAt);
    } catch {
      // Stay on timed_out; user can try again.
    }
  }

  // -------------------------------------------------------------------------
  // Renders by phase
  // -------------------------------------------------------------------------

  if (phase.status === "polling" || phase.status === "submitting") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <Spinner />
        <p className="mt-3 text-sm text-ink-muted">Drafting your action…</p>
      </div>
    );
  }

  if (phase.status === "timed_out") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <p className="text-sm text-ink">
          Draft is taking longer than expected.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          The worker may still be processing. Try checking again in a moment.
        </p>
        <Button onClick={onCheckAgain} variant="secondary" className="mt-4">
          Check again
        </Button>
      </div>
    );
  }

  // filling (and we fall through to the form on `error` too, with the message
  // shown above the submit row so the user can correct and retry).
  const questions = task.questions ?? [];
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        A few quick questions
      </div>

      {questions.map((q) => (
        <div key={q.id}>
          <label
            htmlFor={`answer-${q.id}`}
            className="block text-sm font-medium text-ink"
          >
            {q.prompt}
          </label>
          {q.hint ? (
            <p className="mt-1 text-xs text-ink-muted">{q.hint}</p>
          ) : null}
          {q.prompt.length > PROMPT_LENGTH_FOR_TEXTAREA ? (
            <Textarea
              id={`answer-${q.id}`}
              rows={3}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="mt-2"
            />
          ) : (
            <Input
              id={`answer-${q.id}`}
              type="text"
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="mt-2"
            />
          )}
        </div>
      ))}

      {phase.status === "error" ? (
        <p className="text-sm text-red">{phase.message}</p>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" variant="primary">
          Submit
        </Button>
      </div>
    </form>
  );
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
