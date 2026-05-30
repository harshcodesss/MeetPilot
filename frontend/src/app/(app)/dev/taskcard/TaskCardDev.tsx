"use client";

import { useState } from "react";

import { TaskCard } from "@/components/app/TaskCard";
import { Button } from "@/components/ui/Button";
import {
  mockTaskAnswered,
  mockTaskAwaiting,
  mockTaskDone,
  mockTaskExtracted,
  mockTaskGmail,
  mockTaskSuggested,
} from "@/lib/dev-mocks";
import type { Task } from "@/types";

/**
 * Dev-only client wrapper for the TaskCard permutations grid. Holds the
 * dismissed-id set so the Dismiss button on the suggested card actually
 * removes it from view, with a Reset to bring it back.
 *
 * Each TaskCard manages its own local state (done flag, placement promotion);
 * only dismissal escapes the card because it removes the card itself.
 */
const TASKS: Task[] = [
  mockTaskGmail, // drafted
  mockTaskAwaiting, // awaiting_answers
  mockTaskAnswered, // answered (transient spinner)
  mockTaskExtracted, // extracted, no handler (manual)
  mockTaskDone, // done (dimmed, collapsed by default)
  mockTaskSuggested, // suggested (promote / dismiss)
];

export function TaskCardDev() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = TASKS.filter((t) => !dismissed.has(t.task_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-faint">
          All six body shapes. Click a card to expand / collapse. Mark-as-done,
          Promote, and Dismiss are wired in mock mode (no backend).
        </p>
        {dismissed.size > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(new Set())}
          >
            Reset dismissed
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visible.map((task) => (
          <TaskCard
            key={task.task_id}
            task={task}
            mockMode
            onTaskDismissed={(id) =>
              setDismissed((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
