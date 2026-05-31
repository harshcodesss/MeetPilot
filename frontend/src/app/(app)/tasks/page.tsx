"use client";

import { useEffect, useMemo, useState } from "react";

import { TaskDetailView } from "@/components/board/TaskDetailView";
import { TasksBoard } from "@/components/board/TasksBoard";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import type { Task } from "@/types";

/**
 * Cross-meeting Tasks board.
 *
 * Two views, swapped via `openedTaskId`:
 *   - null      → TasksBoard (Linear-style 4-column grid)
 *   - <task_id> → TaskDetailView (full-page focus on one task)
 *
 * Task list is owned here so card mutations (done toggle, future answer
 * submits) can echo up and the board / detail view stay in sync.
 */

type PageState =
  | { status: "loading" }
  | { status: "loaded" }
  | { status: "error"; message: string };

export default function TasksPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    api
      .get<Task[]>("/me/tasks")
      .then((fetched) => {
        if (cancelled) return;
        setTasks(fetched);
        setPageState({ status: "loaded" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? `Couldn’t load your tasks (HTTP ${err.status}).`
            : "Couldn’t load your tasks. Please check your connection.";
        setPageState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openedTask = useMemo(
    () =>
      openedTaskId === null
        ? null
        : tasks.find((t) => t.task_id === openedTaskId) ?? null,
    [openedTaskId, tasks],
  );

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.task_id === updated.task_id ? updated : t)),
    );
  }

  return (
    <div className="-mx-8 -my-8 min-h-[calc(100vh)] bg-white">
      {pageState.status === "loading" ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      ) : pageState.status === "error" ? (
        <div className="mx-auto mt-12 max-w-xl rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">
            Couldn’t load your tasks
          </h1>
          <p className="mt-2 text-sm text-gray-500">{pageState.message}</p>
        </div>
      ) : openedTask ? (
        <TaskDetailView
          task={openedTask}
          onBack={() => setOpenedTaskId(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      ) : (
        <TasksBoard
          tasks={tasks}
          onOpenTask={(task) => setOpenedTaskId(task.task_id)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}
