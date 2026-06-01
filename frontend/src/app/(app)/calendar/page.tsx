"use client";

import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import {
  HOURS,
  addDays,
  addMonths,
  buildMonthCells,
  buildWeekCells,
  formatHour,
  formatYmd,
  fullDayLabel,
  groupByYmd,
  monthLabel,
  startOfMonth,
  todayLocal,
  weekRangeLabel,
} from "@/lib/calendar";
import type { Confidence, Placement, TaskDeadline } from "@/types";

/**
 * Calendar — a Day / Week / Month timeline of every owned task with a resolved
 * `deadline_date`. Modeled on the reference Gantt tool's chrome (period nav +
 * Day/Week/Month toggle + grid), adapted to our data.
 *
 * Our deadlines are date-only (no time-of-day), so tasks are effectively
 * all-day items. In Day view they sit in an "All day" lane above the 24-hour
 * ruler rather than at a specific clock time.
 *
 * Single fetch `GET /me/tasks/deadlines` (already filters dismissed + done).
 * Grouping by `deadline_date` is client-side; the dataset is small at v1.
 */

type View = "day" | "week" | "month";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  deadlines: TaskDeadline[];
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function CalendarPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Date>(() => todayLocal());

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });
    api
      .get<TaskDeadline[]>("/me/tasks/deadlines")
      .then((deadlines) => {
        if (!cancelled) setPageState({ status: "loaded", deadlines });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setPageState({ status: "error", message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tasksByYmd = useMemo(
    () =>
      pageState.status === "loaded"
        ? groupByYmd(pageState.deadlines)
        : ({} as Record<string, TaskDeadline[]>),
    [pageState],
  );

  function goPrev() {
    setAnchor((a) =>
      view === "month" ? addMonths(a, -1) : addDays(a, view === "week" ? -7 : -1),
    );
  }
  function goNext() {
    setAnchor((a) =>
      view === "month" ? addMonths(a, 1) : addDays(a, view === "week" ? 7 : 1),
    );
  }
  function openDay(date: Date) {
    setAnchor(date);
    setView("day");
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
            Couldn’t load your calendar
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  const label =
    view === "month"
      ? monthLabel(anchor)
      : view === "week"
        ? weekRangeLabel(anchor)
        : fullDayLabel(anchor);

  return (
    // Escape the AppShell's p-8 padding so the calendar runs edge-to-edge and
    // fills the viewport — no page scroll, same footprint in every view.
    <div className="-m-8 flex h-screen flex-col bg-surface">
      <div className="shrink-0 bg-white">
        <div className="px-6 pt-4 pb-3">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your deadlines, plotted before they plot against you.
          </p>
        </div>
        <div className="border-b border-line px-6 py-3">
          <Toolbar
            label={label}
            view={view}
            onPrev={goPrev}
            onNext={goNext}
            onToday={() => setAnchor(todayLocal())}
            onViewChange={setView}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "month" ? (
          <MonthView anchor={anchor} tasksByYmd={tasksByYmd} onOpenDay={openDay} />
        ) : view === "week" ? (
          <WeekView anchor={anchor} tasksByYmd={tasksByYmd} onOpenDay={openDay} />
        ) : (
          <DayView anchor={anchor} tasksByYmd={tasksByYmd} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar — period nav + Today + Day/Week/Month segmented toggle
// ---------------------------------------------------------------------------

function Toolbar({
  label,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: {
  label: string;
  view: View;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: View) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Period nav — ‹ [calendar] label › ; the label doubles as "go to
          today" (click to jump back to the current period). */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onToday}
          title="Go to today"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface"
        >
          <Calendar className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
          <span className="text-base font-semibold text-ink">{label}</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface p-0.5">
        {(["day", "week", "month"] as View[]).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`relative rounded-md px-3 py-1 text-[13px] font-medium capitalize transition-colors ${
                active ? "text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="calendar-view-pill"
                  className="absolute inset-0 rounded-md bg-red shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-10">{v}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month view — 6×7 grid; each cell shows up to two task chips + overflow
// ---------------------------------------------------------------------------

function MonthView({
  anchor,
  tasksByYmd,
  onOpenDay,
}: {
  anchor: Date;
  tasksByYmd: Record<string, TaskDeadline[]>;
  onOpenDay: (d: Date) => void;
}) {
  const allCells = buildMonthCells(startOfMonth(anchor));
  // The 6th week is usually all next-month padding — drop it when it carries
  // no days of the displayed month (keeps it only for true 6-week months).
  const cells = allCells.slice(35).every((c) => !c.inMonth)
    ? allCells.slice(0, 35)
    : allCells;
  const rowsClass = cells.length === 35 ? "grid-rows-5" : "grid-rows-6";
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium uppercase tracking-wide text-ink-muted"
          >
            {d}
          </div>
        ))}
      </div>
      <div className={`grid flex-1 grid-cols-7 ${rowsClass}`}>
        {cells.map((cell, i) => {
          const tasks = tasksByYmd[cell.ymd] ?? [];
          const isToday = cell.position === "today" && cell.inMonth;
          return (
            <div
              key={cell.ymd}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDay(cell.date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpenDay(cell.date);
              }}
              className={`flex cursor-pointer flex-col overflow-hidden border-line p-1.5 transition-colors hover:bg-white ${
                i % 7 !== 6 ? "border-r" : ""
              } ${i < cells.length - 7 ? "border-b" : ""} ${
                cell.inMonth ? "" : "bg-black/[0.02]"
              }`}
            >
              <div className="flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-primary text-white"
                      : cell.inMonth
                        ? "text-ink"
                        : "text-ink-faint"
                  }`}
                >
                  {cell.day}
                </span>
              </div>
              <div className="mt-1 min-h-0 flex-1 space-y-1 overflow-hidden">
                {tasks.slice(0, 2).map((t) => (
                  <TaskChip key={t.task_id} task={t} />
                ))}
                {tasks.length > 2 ? (
                  <div className="px-1 text-[11px] font-medium text-ink-muted">
                    +{tasks.length - 2} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week view — seven Sun→Sat day columns; tasks stacked within each
// ---------------------------------------------------------------------------

function WeekView({
  anchor,
  tasksByYmd,
  onOpenDay,
}: {
  anchor: Date;
  tasksByYmd: Record<string, TaskDeadline[]>;
  onOpenDay: (d: Date) => void;
}) {
  const cells = buildWeekCells(anchor);
  return (
    <div className="grid h-full grid-cols-7">
      {cells.map((cell, i) => {
        const tasks = tasksByYmd[cell.ymd] ?? [];
        const isToday = cell.position === "today";
        return (
          <div
            key={cell.ymd}
            className={`flex min-h-0 flex-col ${i !== 6 ? "border-r border-line" : ""}`}
          >
            <button
              type="button"
              onClick={() => onOpenDay(cell.date)}
              className="flex w-full shrink-0 flex-col items-center gap-0.5 border-b border-line py-2 transition-colors hover:bg-surface"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                {WEEKDAY_LABELS[i]}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-primary text-white" : "text-ink"
                }`}
              >
                {cell.day}
              </span>
            </button>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
              {tasks.length === 0 ? null : (
                tasks.map((t) => <TaskCard key={t.task_id} task={t} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day view — all-day lane (where our untimed tasks live) + 24-hour ruler
// ---------------------------------------------------------------------------

function DayView({
  anchor,
  tasksByYmd,
}: {
  anchor: Date;
  tasksByYmd: Record<string, TaskDeadline[]>;
}) {
  const ymd = formatYmd(anchor);
  const tasks = tasksByYmd[ymd] ?? [];
  return (
    <div className="flex h-full flex-col">
      {/* Hour ruler header — 12am → 12am across the full width. */}
      <div className="flex shrink-0 border-b border-line">
        {HOURS.map((h) => (
          <div
            key={h}
            className="flex-1 border-r border-line py-1.5 text-center text-[10px] font-medium uppercase text-ink-faint last:border-r-0"
          >
            {formatHour(h)}
          </div>
        ))}
      </div>

      {/* Body — hour gridlines behind; tasks render as all-day bars spanning
          the full 12am → 12am width (our deadlines have no clock time). */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 flex">
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex-1 border-r border-line last:border-r-0"
            />
          ))}
        </div>
        {tasks.length === 0 ? (
          <p className="relative p-4 text-sm text-ink-muted">
            No tasks due on this day.
          </p>
        ) : (
          <div className="relative space-y-2 p-3">
            {tasks.map((t) => (
              <DayBar key={t.task_id} task={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task renderers — chip (month cells, tight) and card (week / day, roomier)
// ---------------------------------------------------------------------------

function TaskChip({ task }: { task: TaskDeadline }) {
  return (
    <Link
      href={taskHref(task)}
      onClick={(e) => e.stopPropagation()}
      title={`${task.assignee}: ${task.action}`}
      className="flex items-center gap-1.5 rounded-md border border-line bg-white px-1.5 py-1 shadow-sm transition-colors hover:bg-surface"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(task)}`}
      />
      <span className="truncate text-[11px] font-medium text-ink">
        {task.action}
      </span>
    </Link>
  );
}

// Full-width all-day bar for Day view — spans the whole 12am→12am ruler.
// The bar itself is a faded confidence-colored box; the dot up front stays
// full-strength.
function DayBar({ task }: { task: TaskDeadline }) {
  return (
    <Link
      href={taskHref(task)}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-opacity hover:opacity-90 ${boxColor(task)}`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(task)}`} />
      <span className="truncate text-sm font-medium text-ink">
        {task.action}
      </span>
      <span className="ml-auto shrink-0 text-xs text-ink-muted">
        {task.assignee}
      </span>
    </Link>
  );
}

function TaskCard({ task }: { task: TaskDeadline }) {
  return (
    <Link
      href={taskHref(task)}
      className="block h-[72px] overflow-hidden rounded-md border border-line bg-white p-2 shadow-sm transition-colors hover:bg-surface"
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor(task)}`} />
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-ink-muted">
          {task.assignee}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-xs text-ink">{task.action}</div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taskHref(task: TaskDeadline): string {
  return `/meetings/${task.session_id}#task-${task.task_id}`;
}

// Confidence-based accent — main-list tasks carry the green/yellow/red trust
// signal; suggested tasks stay neutral (confidence is irrelevant until the
// user promotes them, per the brief).
const DOT_BY_CONFIDENCE: Record<Confidence, string> = {
  high: "bg-green",
  moderate: "bg-yellow",
  low: "bg-red",
};
// Faded confidence fill for Day-view bars (the brief's light status tints).
const BOX_BY_CONFIDENCE: Record<Confidence, string> = {
  high: "bg-green-bg",
  moderate: "bg-yellow-bg",
  low: "bg-red-bg",
};

function isMainList(placement: Placement): boolean {
  return placement === "main_list";
}

function dotColor(task: TaskDeadline): string {
  return isMainList(task.placement)
    ? DOT_BY_CONFIDENCE[task.confidence]
    : "bg-ink-faint";
}

function boxColor(task: TaskDeadline): string {
  return isMainList(task.placement)
    ? BOX_BY_CONFIDENCE[task.confidence]
    : "bg-surface";
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load your calendar (HTTP ${err.status}).`;
  }
  return "Couldn’t load your calendar. Please check your connection.";
}
