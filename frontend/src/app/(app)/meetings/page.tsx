"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MeetingCard } from "@/components/app/MeetingCard";
import { TranscriptView } from "@/components/app/TranscriptView";
import { FilterIcon } from "@/components/board/icons";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { loadBookmarks, saveBookmarks } from "@/lib/bookmarks";
import type { Session } from "@/types";

// Which slice of meetings the list is showing.
type View = "all" | "bookmarked";

// Sort modes for the meetings list. The backend already returns newest-first;
// "oldest" just reverses. Labels mirror the tasks-board filter style.
type SortMode = "newest" | "oldest";

const SORT_LABELS: Record<SortMode, string> = {
  newest: "Newest",
  oldest: "Oldest",
};

function sortSessions(sessions: Session[], mode: SortMode): Session[] {
  const byTime = [...sessions].sort(
    (a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
  return mode === "newest" ? byTime : byTime.reverse();
}

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
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [view, setView] = useState<View>("all");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  // When set, the transcript view for this session swaps in over the list.
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null);

  // Hydrate bookmarks from localStorage once on mount.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setBookmarks(loadBookmarks()), []);

  function toggleBookmark(sessionId: string) {
    setBookmarks((prev) => {
      const next = prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId];
      saveBookmarks(next);
      return next;
    });
  }

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

  // Transcript view swaps in over the whole list when a card's Transcript
  // stat is clicked.
  const openSession = openTranscriptId
    ? pageState.sessions.find((s) => s.session_id === openTranscriptId)
    : undefined;
  if (openSession) {
    return (
      <TranscriptView
        sessionId={openSession.session_id}
        title={openSession.title}
        startedAt={openSession.started_at}
        onBack={() => setOpenTranscriptId(null)}
      />
    );
  }

  const sorted = sortSessions(pageState.sessions, sortMode);
  const visible =
    view === "bookmarked"
      ? sorted.filter((s) => bookmarks.includes(s.session_id))
      : sorted;

  return (
    <div className="mx-auto max-w-6xl">
      <Header count={pageState.sessions.length} />

      {pageState.sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between border-b border-line pb-3">
            <ViewTabs
              value={view}
              onChange={setView}
              bookmarkCount={bookmarks.length}
            />
            <SortSelector value={sortMode} onChange={setSortMode} />
          </div>

          {visible.length === 0 ? (
            <p className="mt-12 text-center text-sm text-ink-muted">
              No bookmarked meetings yet. Tap the bookmark icon on any meeting
              to pin it here.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((s) => (
                <MeetingCard
                  key={s.session_id}
                  session={s}
                  isBookmarked={bookmarks.includes(s.session_id)}
                  onToggleBookmark={() => toggleBookmark(s.session_id)}
                  onOpenTranscript={() => setOpenTranscriptId(s.session_id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// View tabs — "All meetings" / "Bookmarked" segmented control (left side of
// the filter row).
// ---------------------------------------------------------------------------

function ViewTabs({
  value,
  onChange,
  bookmarkCount,
}: {
  value: View;
  onChange: (v: View) => void;
  bookmarkCount: number;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface p-0.5">
      <TabButton active={value === "all"} onClick={() => onChange("all")}>
        All meetings
      </TabButton>
      <TabButton
        active={value === "bookmarked"}
        onClick={() => onChange("bookmarked")}
      >
        <Bookmark
          className="h-3.5 w-3.5"
          strokeWidth={1.75}
          fill={value === "bookmarked" ? "currentColor" : "none"}
        />
        Bookmarked
        {bookmarkCount > 0 ? (
          <span className="text-ink-faint">{bookmarkCount}</span>
        ) : null}
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "bg-white text-ink shadow-sm"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sort selector — funnel icon + disclosure menu, mirrors the tasks board
// (BoardHeader) so the two pages feel consistent.
// ---------------------------------------------------------------------------

function SortSelector({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (m: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[12px] text-ink hover:text-ink"
      >
        <FilterIcon className="h-3.5 w-3.5 text-ink-muted" />
        <span className="text-ink-muted">Filter:</span>
        <span className="font-medium">{SORT_LABELS[value]}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-line bg-white py-1 shadow-md">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onChange(mode);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-surface ${
                value === mode ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              <span>{SORT_LABELS[mode]}</span>
              {value === mode ? <span className="text-primary">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
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
          Every meeting you sat through, minus the part where you forgot what
          you agreed to.
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
