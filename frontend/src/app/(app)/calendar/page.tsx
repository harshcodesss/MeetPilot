"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ConfidenceBadge } from "@/components/app/ConfidenceBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import {
  type CalendarCell,
  addMonths,
  buildMonthCells,
  groupByYmd,
  monthLabel,
  parseLocalDate,
  startOfMonth,
  todayLocal,
} from "@/lib/calendar";
import type { TaskDeadline } from "@/types";

/**
 * Calendar page — every owned task with a resolved `deadline_date`, plotted
 * onto a month grid. Click a date to expand that day's tasks below; click a
 * task to deep-link into Meeting Detail with a `#task-<id>` hash.
 *
 * Critical Read 5 LOCKED: overdue tasks are INCLUDED. The cell colour
 * communicates past / today / future:
 *   - past   → red (semantic urgent: "you missed this")
 *   - today  → primary-tint blue (current focus — NOT green; green stays
 *              reserved for confidence-success per the brief)
 *   - future → neutral
 *
 * Single fetch `GET /me/tasks/deadlines` (slim projection — already filters
 * dismissed + done at the API boundary). Grouping by `deadline_date` happens
 * client-side; the dataset is small at v1 scale.
 */

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
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() =>
    startOfMonth(todayLocal()),
  );
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    api
      .get<TaskDeadline[]>("/me/tasks/deadlines")
      .then((deadlines) => {
        if (cancelled) return;
        setPageState({ status: "loaded", deadlines });
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

  const tasksByYmd = useMemo(
    () =>
      pageState.status === "loaded"
        ? groupByYmd(pageState.deadlines)
        : ({} as Record<string, TaskDeadline[]>),
    [pageState],
  );

  const cells = useMemo(
    () => buildMonthCells(displayedMonth),
    [displayedMonth],
  );

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

  const selectedTasks = selectedYmd ? tasksByYmd[selectedYmd] ?? [] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Calendar
      </h1>

      <Card>
        <MonthHeader
          displayedMonth={displayedMonth}
          onPrev={() => {
            setDisplayedMonth((m) => addMonths(m, -1));
            setSelectedYmd(null);
          }}
          onNext={() => {
            setDisplayedMonth((m) => addMonths(m, 1));
            setSelectedYmd(null);
          }}
          onToday={() => {
            setDisplayedMonth(startOfMonth(todayLocal()));
            setSelectedYmd(null);
          }}
        />

        <div className="mt-4 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-2 text-center text-xs font-medium uppercase tracking-wide text-ink-muted"
            >
              {label}
            </div>
          ))}
          {cells.map((cell) => (
            <DayCell
              key={cell.ymd}
              cell={cell}
              count={(tasksByYmd[cell.ymd] ?? []).length}
              isSelected={selectedYmd === cell.ymd}
              onClick={() =>
                setSelectedYmd((cur) => (cur === cell.ymd ? null : cell.ymd))
              }
            />
          ))}
        </div>
      </Card>

      {selectedYmd ? (
        <SelectedDayPanel
          ymd={selectedYmd}
          tasks={selectedTasks ?? []}
          onClose={() => setSelectedYmd(null)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month header — prev / month label / next / today
// ---------------------------------------------------------------------------

function MonthHeader({
  displayedMonth,
  onPrev,
  onNext,
  onToday,
}: {
  displayedMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-medium text-ink">
        {monthLabel(displayedMonth)}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayCell — one date in the month grid
// ---------------------------------------------------------------------------

function DayCell({
  cell,
  count,
  isSelected,
  onClick,
}: {
  cell: CalendarCell;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const dimmed = !cell.inMonth;
  const todayHighlight =
    cell.position === "today" && cell.inMonth
      ? "bg-primary-tint border-primary"
      : "border-line";
  const selectedHighlight = isSelected
    ? "ring-2 ring-primary ring-offset-1"
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${cell.date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}${count > 0 ? `, ${count} ${count === 1 ? "task" : "tasks"}` : ""}`}
      className={`relative flex h-20 flex-col items-stretch justify-between rounded-xl border bg-white p-2 text-left transition-colors hover:bg-surface ${todayHighlight} ${selectedHighlight}`}
    >
      <span
        className={`text-sm font-medium ${
          dimmed
            ? "text-ink-faint"
            : cell.position === "today"
              ? "text-primary"
              : "text-ink"
        }`}
      >
        {cell.day}
      </span>
      {count > 0 && cell.inMonth ? (
        <CountBadge count={count} position={cell.position} />
      ) : null}
    </button>
  );
}

function CountBadge({
  count,
  position,
}: {
  count: number;
  position: CalendarCell["position"];
}) {
  const tone =
    position === "past" ? "danger" : position === "today" ? "info" : "neutral";
  return (
    <span className="self-start">
      <Badge tone={tone}>
        {count} {count === 1 ? "task" : "tasks"}
      </Badge>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Selected-day panel — list of tasks due on the clicked date
// ---------------------------------------------------------------------------

function SelectedDayPanel({
  ymd,
  tasks,
  onClose,
}: {
  ymd: string;
  tasks: TaskDeadline[];
  onClose: () => void;
}) {
  const date = parseLocalDate(ymd);
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-ink">{label}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          Close
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No tasks due on this day.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.task_id} task={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TaskRow({ task }: { task: TaskDeadline }) {
  return (
    <Link
      href={`/meetings/${task.session_id}#task-${task.task_id}`}
      className="block rounded-xl border border-line bg-white p-3 transition-colors hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {task.assignee}
          </div>
          <div className="mt-1 text-sm text-ink">{task.action}</div>
        </div>
        {task.placement === "main_list" ? (
          <ConfidenceBadge confidence={task.confidence} />
        ) : null}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load your calendar (HTTP ${err.status}).`;
  }
  return "Couldn’t load your calendar. Please check your connection.";
}
