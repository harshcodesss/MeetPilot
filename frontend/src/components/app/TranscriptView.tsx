"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Segment } from "@/types";

interface TranscriptViewProps {
  sessionId: string;
  title: string | null;
  startedAt: string;
  /** Return to the meetings list. */
  onBack: () => void;
}

/**
 * Full-page transcript for a single meeting — swapped in over the Meetings
 * list when the user clicks a card's "Transcript" stat. Just the transcript,
 * nothing else (tasks/drafts live on the meeting detail page). A back arrow
 * at the top-left returns to the list.
 */
export function TranscriptView({
  sessionId,
  title,
  startedAt,
  onBack,
}: TranscriptViewProps) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "loaded"; segments: Segment[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .get<Segment[]>(`/me/sessions/${sessionId}/transcript`)
      .then((segments) => {
        if (!cancelled) setState({ status: "loaded", segments });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back
      </button>

      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title ?? "Untitled meeting"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Transcript · {formatDateTime(startedAt)}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white shadow-soft">
        {state.status === "loading" ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner />
          </div>
        ) : state.status === "error" ? (
          <p className="p-6 text-sm text-ink-muted">{state.message}</p>
        ) : state.segments.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Transcript not available.</p>
        ) : (
          <ol className="divide-y divide-line">
            {state.segments.map((s) => (
              <li key={s.seq} className="px-5 py-4 text-sm">
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
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "This meeting’s transcript wasn’t found.";
    if (err.status === 403) return "You don’t have access to this meeting.";
    return `Couldn’t load the transcript (HTTP ${err.status}).`;
  }
  return "Couldn’t load the transcript. Please check your connection.";
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
