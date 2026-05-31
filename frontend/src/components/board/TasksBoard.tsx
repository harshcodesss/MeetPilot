"use client";

import { useMemo, useState } from "react";

import { bucketTasks } from "@/lib/buckets";
import type { Task } from "@/types";

import { BoardColumn } from "./BoardColumn";
import { BoardHeader, type SortMode } from "./BoardHeader";
import {
  HeaderAlertIcon,
  HeaderBulbIcon,
  HeaderCheckIcon,
  HeaderDocumentIcon,
} from "./icons";

interface TasksBoardProps {
  tasks: Task[];
  /** Called when the user picks "Open" from a card's `…` menu. */
  onOpenTask?: (task: Task) => void;
  /** Echoed up after a card mutation (done toggle) so the page can rebucket. */
  onTaskUpdated?: (task: Task) => void;
}

const CONFIDENCE_ORDER: Record<string, number> = {
  high: 0,
  moderate: 1,
  low: 2,
};

/**
 * The four-column Tasks board.
 *
 * Columns (locked with Harsh):
 *   1. Drafted        — main_list + draft_state=drafted, not done
 *   2. Need Answers   — main_list + draft_state=awaiting_answers, not done
 *   3. Suggestions    — placement=suggested, not done
 *   4. Completed      — is_done=true (regardless of original placement)
 *
 * Bucket routing reuses the locked precedence in `lib/buckets.ts` so this
 * stays in sync with every other surface using the same taxonomy.
 *
 * Sort selector in the header reorders tasks BEFORE bucketing, so the
 * within-column order reflects the chosen mode. MP-### display IDs are
 * computed off the original created_at order so they don't shuffle when
 * the sort changes — IDs are stable identifiers, not display order.
 */
export function TasksBoard({ tasks, onOpenTask, onTaskUpdated }: TasksBoardProps) {
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // Stable MP-### sequence — uses creation order, never changes with sort.
  const indexById = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      const t = a.created_at.localeCompare(b.created_at);
      return t !== 0 ? t : a.task_id.localeCompare(b.task_id);
    });
    const m = new Map<string, number>();
    sorted.forEach((t, i) => m.set(t.task_id, i + 1));
    return m;
  }, [tasks]);

  const buckets = useMemo(() => {
    const sorted = sortTasks(tasks, sortMode);
    return bucketTasks(sorted);
  }, [tasks, sortMode]);

  return (
    <div className="bg-white">
      <BoardHeader sortMode={sortMode} onSortChange={setSortMode} />
      <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-y-0 md:divide-x lg:grid-cols-4">
        <BoardColumn
          label="Drafted"
          tasks={buckets.drafted}
          HeaderIcon={HeaderDocumentIcon}
          indexById={indexById}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
        />
        <BoardColumn
          label="Need Answers"
          tasks={buckets.awaiting}
          HeaderIcon={HeaderAlertIcon}
          indexById={indexById}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
        />
        <BoardColumn
          label="Suggestions"
          tasks={buckets.suggested}
          HeaderIcon={HeaderBulbIcon}
          indexById={indexById}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
        />
        <BoardColumn
          label="Completed"
          tasks={buckets.done}
          HeaderIcon={HeaderCheckIcon}
          indexById={indexById}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    </div>
  );
}

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  if (mode === "recent") {
    return [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return [...tasks].sort((a, b) => {
    const order =
      (CONFIDENCE_ORDER[a.confidence] ?? 99) -
      (CONFIDENCE_ORDER[b.confidence] ?? 99);
    if (order !== 0) return order;
    return b.created_at.localeCompare(a.created_at);
  });
}
