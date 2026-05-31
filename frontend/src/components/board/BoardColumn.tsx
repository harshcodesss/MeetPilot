"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";

import type { Task } from "@/types";

import { BoardTaskCard } from "./BoardTaskCard";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";

interface BoardColumnProps {
  label: string;
  tasks: Task[];
  /** Icon rendered before the column label (e.g. red alert badge for "Need Answers"). */
  HeaderIcon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Map task_id → 1-based MP-### sequence across the whole board. */
  indexById: Map<string, number>;
  /** Open the task in the full-page detail view. */
  onOpenTask?: (task: Task) => void;
  /** Echoed up after a successful done/undone mutation so the board can re-render. */
  onTaskUpdated?: (task: Task) => void;
}

type LocalSort = "asc" | "desc" | null;

const CONFIDENCE_ORDER: Record<string, number> = {
  high: 0,
  moderate: 1,
  low: 2,
};

/**
 * Single board column. Header carries the column icon, label, count, and two
 * arrows for per-column confidence sort. The arrows are LOCAL to this column
 * — they don't affect the board-wide sort selector in the header.
 *
 *   ↑ ascending  = low → moderate → high (least-confident first)
 *   ↓ descending = high → moderate → low (most-confident first)
 *
 * Clicking an already-active arrow clears it, returning to the order the
 * column received (which itself comes from the board-wide sort).
 */
export function BoardColumn({
  label,
  tasks,
  HeaderIcon,
  indexById,
  onOpenTask,
  onTaskUpdated,
}: BoardColumnProps) {
  const [localSort, setLocalSort] = useState<LocalSort>(null);

  const displayed = useMemo(() => {
    if (localSort === null) return tasks;
    return [...tasks].sort((a, b) => {
      const A = CONFIDENCE_ORDER[a.confidence] ?? 99;
      const B = CONFIDENCE_ORDER[b.confidence] ?? 99;
      return localSort === "desc" ? A - B : B - A;
    });
  }, [tasks, localSort]);

  return (
    <div className="flex min-h-[480px] flex-col bg-white">
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <HeaderIcon className="h-3.5 w-3.5" />
          <h2 className="text-[12px] font-semibold text-gray-900">{label}</h2>
          <span className="text-[12px] text-gray-400">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() =>
              setLocalSort((s) => (s === "asc" ? null : "asc"))
            }
            className={`rounded p-1 hover:bg-gray-50 ${
              localSort === "asc"
                ? "text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-label="Sort by confidence ascending"
            aria-pressed={localSort === "asc"}
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setLocalSort((s) => (s === "desc" ? null : "desc"))
            }
            className={`rounded p-1 hover:bg-gray-50 ${
              localSort === "desc"
                ? "text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-label="Sort by confidence descending"
            aria-pressed={localSort === "desc"}
          >
            <ArrowDownIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {displayed.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-gray-400">No tasks yet.</p>
        ) : (
          displayed.map((t) => (
            <BoardTaskCard
              key={t.task_id}
              task={t}
              index={indexById.get(t.task_id) ?? 0}
              onOpen={onOpenTask}
              onTaskUpdated={onTaskUpdated}
            />
          ))
        )}
      </div>
    </div>
  );
}
