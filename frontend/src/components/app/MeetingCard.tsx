import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Session } from "@/types";

interface MeetingCardProps {
  session: Session;
}

/**
 * One captured meeting, as it appears in the Meetings list (Phase 5) and the
 * Dashboard's "recent meetings" strip (Phase 6).
 *
 * Color discipline (brief): green / yellow are reserved for confidence +
 * status semantics. Used here only where they ARE the semantic:
 *   - "N ready" badge → green ("good / ready", the brief's drafts-ready tint)
 *   - "N awaiting" badge → yellow ("needs attention")
 *   - status badge → info (primary-tint blue) for `active`, neutral gray for
 *     `complete`. Status is a CATEGORY, not a severity — green-for-active
 *     would collide with the confidence-high semantic.
 *
 * Zero-count badges are omitted entirely — empty pills add noise without
 * information.
 */
export function MeetingCard({ session }: MeetingCardProps) {
  return (
    <Link href={`/meetings/${session.session_id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink">
              {formatDate(session.started_at)}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {session.title ?? "Untitled meeting"}
            </div>
          </div>
          <Badge tone={session.status === "active" ? "info" : "neutral"}>
            {session.status}
          </Badge>
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-ink-muted">
          <span>
            {session.task_count} {pluralise("task", session.task_count)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{session.segment_count} segments</span>
          {session.drafts_ready_count > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <Badge tone="success">{session.drafts_ready_count} ready</Badge>
            </>
          ) : null}
          {session.awaiting_count > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <Badge tone="warn">{session.awaiting_count} awaiting</Badge>
            </>
          ) : null}
        </div>
      </Card>
    </Link>
  );
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

function pluralise(word: string, n: number): string {
  return n === 1 ? word : `${word}s`;
}
