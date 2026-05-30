/**
 * Tasks-board column bucketing.
 *
 * Pure function — no React, no fetch, easy to reason about and (when we
 * eventually wire test infra) test in isolation. The Tasks page imports
 * `bucketTasks(tasks)` and renders the resulting map into four columns.
 *
 * Precedence is LOCKED (Critical Read 3 + brief). Top-down:
 *
 *   1. placement === 'dismissed'        → null (filtered, gone from view)
 *   2. is_done === true                 → 'done'         (wins over draft / placement)
 *   3. placement === 'suggested'        → 'suggested'    (wins over draft state)
 *   4. placement === 'main_list' …
 *        draft_state === 'awaiting_answers'  → 'awaiting'
 *        draft_state === 'drafted'           → 'drafted'
 *   5. anything else (extracted with no handler, manual route)
 *                                            → null      (Meeting Detail only)
 *
 * Belt-and-suspenders note: `/me/tasks` already filters dismissed at the API
 * boundary (Phase 0.3). The check here catches in-flight client state during
 * a Dismiss click before the parent's local list is rebuilt.
 */

import type { Task } from "@/types";

export type Bucket = "drafted" | "awaiting" | "suggested" | "done";

export function bucketFor(task: Task): Bucket | null {
  if (task.placement === "dismissed") return null;
  if (task.is_done) return "done";
  if (task.placement === "suggested") return "suggested";
  if (task.placement !== "main_list") return null;
  if (task.draft_state === "awaiting_answers") return "awaiting";
  if (task.draft_state === "drafted") return "drafted";
  return null;
}

export function bucketTasks(tasks: Task[]): Record<Bucket, Task[]> {
  const buckets: Record<Bucket, Task[]> = {
    drafted: [],
    awaiting: [],
    suggested: [],
    done: [],
  };
  for (const t of tasks) {
    const b = bucketFor(t);
    if (b) buckets[b].push(t);
  }
  return buckets;
}
