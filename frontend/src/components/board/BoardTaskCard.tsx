"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";

import { ApiError, api } from "@/lib/api";
import type { Task } from "@/types";

import {
  CheckIcon,
  DocumentIcon,
  ExclamationIcon,
  LightbulbIcon,
  MoreHorizontalIcon,
} from "./icons";

interface BoardTaskCardProps {
  task: Task;
  /** 1-based sequence across the user's tasks; renders as MP-### display ID. */
  index: number;
  /** Open the task in the full-page detail view. */
  onOpen?: (task: Task) => void;
  /** Echoed up after a successful done/undone mutation so parents can re-render. */
  onTaskUpdated?: (task: Task) => void;
}

/**
 * Compact Linear-style task card for the Tasks board.
 *
 * The `…` button opens a small disclosure menu with two options:
 *   - Open                  → expands the task into the full-page detail view
 *   - Mark as done / undone → PATCH /tasks/{id}/done, then echo up via
 *                              onTaskUpdated so the parent can rebucket
 *
 * Click-outside closes the menu. Active row hover is on the menu items, not
 * the card itself — the card body stays non-interactive per the spec.
 */
export function BoardTaskCard({
  task,
  index,
  onOpen,
  onTaskUpdated,
}: BoardTaskCardProps) {
  const id = `MP-${String(index).padStart(3, "0")}`;
  const StatusIcon = statusIconFor(task);
  const dot = confidenceDotClass(task.confidence);
  const initials = initialsFor(task.assignee);
  const avatarColor = avatarColorFor(task.assignee);

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  async function toggleDone() {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await api.patch<Task>(`/tasks/${task.task_id}/done`, {
        is_done: !task.is_done,
      });
      onTaskUpdated?.(updated);
    } catch (err) {
      console.error("Failed to toggle done:", err instanceof ApiError ? err.message : err);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  function handleOpen() {
    setMenuOpen(false);
    onOpen?.(task);
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-400">
          <StatusIcon className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium text-gray-500">{id}</span>
        </div>
        <Avatar initials={initials} colorClass={avatarColor} />
      </div>

      <p className="mt-2 line-clamp-3 text-[13px] font-medium leading-snug text-gray-900">
        {task.action}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-block h-2 w-2 rounded-full ${dot}`}
          aria-label={`Confidence: ${task.confidence}`}
        />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Task actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontalIcon className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-md"
            >
              <MenuItem label="Open" onClick={handleOpen} />
              <MenuItem
                label={task.is_done ? "Mark as undone" : "Mark as done"}
                onClick={toggleDone}
                disabled={busy}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu item
// ---------------------------------------------------------------------------

function MenuItem({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="block w-full px-3 py-1.5 text-left text-[12px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIconFor(task: Task): ComponentType<SVGProps<SVGSVGElement>> {
  if (task.is_done) return CheckIcon;
  if (task.placement === "suggested") return LightbulbIcon;
  if (task.draft_state === "awaiting_answers") return ExclamationIcon;
  return DocumentIcon;
}

function confidenceDotClass(confidence: string): string {
  switch (confidence) {
    case "high":
      return "bg-green-500";
    case "moderate":
      return "bg-yellow-500";
    case "low":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

function initialsFor(name: string): string {
  if (!name || name.toLowerCase() === "unassigned") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? "") + (parts[1]![0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

function avatarColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

function Avatar({
  initials,
  colorClass,
}: {
  initials: string;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${colorClass}`}
    >
      {initials}
    </span>
  );
}
