import { Bookmark, FileText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Session } from "@/types";

interface MeetingCardProps {
  session: Session;
  /** Whether this meeting is in the user's bookmark list. */
  isBookmarked?: boolean;
  /** Toggle bookmark. When omitted (e.g. on the dashboard), the bookmark
   *  button is hidden entirely. */
  onToggleBookmark?: () => void;
  /** Open this meeting's transcript. When omitted, the Transcript stat is
   *  static (not clickable). */
  onOpenTranscript?: () => void;
}

/**
 * One captured meeting, as it appears in the Meetings list and the Dashboard's
 * "recent meetings" strip.
 *
 * Layout: header (date + title · bookmark + status badge) → a four-up stat row
 * (Tasks · Transcript · Drafted · Awaiting), each a number/value stacked over
 * its label → an "Open meeting" CTA pinned to the bottom.
 *
 * Navigation: ONLY the "Open meeting" button routes into the detail page — the
 * card body is not clickable, so the bookmark toggle and the open action don't
 * fight each other.
 *
 * Color discipline (brief): green / yellow are reserved for confidence +
 * status semantics. Used here only where they ARE the semantic — the
 * "Drafted" count is green (ready), "Awaiting" is yellow (needs attention),
 * the "complete" status badge is green. Tasks / Transcript stay neutral ink;
 * the bookmark uses brand blue when active.
 */
export function MeetingCard({
  session,
  isBookmarked = false,
  onToggleBookmark,
  onOpenTranscript,
}: MeetingCardProps) {
  return (
    <Card className="flex h-56 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-ink">
            {formatDate(session.started_at)}
          </div>
          <div className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
            {session.title ?? "Untitled meeting"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleBookmark ? (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark meeting"}
              aria-pressed={isBookmarked}
              className={`-m-1 rounded-md p-1 transition-colors ${
                isBookmarked
                  ? "text-primary"
                  : "text-ink-faint hover:text-ink"
              }`}
            >
              <Bookmark
                className="h-4 w-4"
                strokeWidth={1.75}
                fill={isBookmarked ? "currentColor" : "none"}
              />
            </button>
          ) : null}
          <Badge tone={session.status === "active" ? "info" : "success"}>
            {session.status}
          </Badge>
        </div>
      </div>

      {/* Four-up stat row — evenly distributed, all aligned to the same
          baseline (value above, label below). */}
      <div className="mt-auto grid grid-cols-4 gap-2">
        <Stat value={session.task_count} label="Tasks" />
        <Stat
          value={<FileText className="h-5 w-5" strokeWidth={1.75} />}
          label="Transcript"
          onClick={onOpenTranscript}
        />
        <Stat
          value={session.drafts_ready_count}
          label="Drafted"
          valueClass="text-green"
        />
        <Stat
          value={session.awaiting_count}
          label="Awaiting"
          valueClass="text-yellow"
        />
      </div>

      <Link
        href={`/meetings/${session.session_id}`}
        className="mt-4 flex items-center justify-center rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-primary hover:bg-primary-tint hover:text-primary"
      >
        Open meeting
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat — one stacked metric: value on top, label below.
// ---------------------------------------------------------------------------

function Stat({
  value,
  label,
  valueClass = "text-ink",
  onClick,
}: {
  value: ReactNode;
  label: string;
  valueClass?: string;
  /** When provided, the whole stat becomes a button with a hover affordance. */
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={`flex h-7 items-center text-xl font-semibold leading-none transition-colors ${valueClass} ${onClick ? "group-hover/stat:text-primary" : ""}`}
      >
        {value}
      </span>
      <span className="text-[11px] text-ink-muted transition-colors group-hover/stat:text-primary">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group/stat flex flex-col items-center gap-0.5 rounded-md py-1 transition-colors hover:bg-surface"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex flex-col items-center gap-0.5">{inner}</div>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  // "May 28, 2026 · 10:37 PM"
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
