"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronRightIcon,
  FilterIcon,
  WorkspaceBadge,
} from "./icons";

export type SortMode = "recent" | "confidence";

const SORT_LABELS: Record<SortMode, string> = {
  recent: "Recently",
  confidence: "Confidence level",
};

interface BoardHeaderProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

/**
 * Board header — breadcrumbs, pill chip row, and the funnel-icon sort
 * selector. Pills are decorative for now; the sort selector is live and
 * controls the column ordering via the parent TasksBoard.
 */
export function BoardHeader({ sortMode, onSortChange }: BoardHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center gap-1.5 px-4 pt-3 text-[11px] text-gray-500">
        <span>MeetPilot</span>
        <ChevronRightIcon className="h-3 w-3 text-gray-300" />
        <span className="text-gray-700">All Tasks</span>
      </div>

      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <Pill label="MeetPilot" active />
        <span className="ml-2 text-[11px] font-medium text-gray-700">
          Confidence
        </span>
        <ConfidenceLegendItem label="high" dotClass="bg-green-500" />
        <ConfidenceLegendItem label="moderate" dotClass="bg-yellow-500" />
        <ConfidenceLegendItem label="low" dotClass="bg-red-500" />
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <SortSelector value={sortMode} onChange={onSortChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

function ConfidenceLegendItem({
  label,
  dotClass,
}: {
  label: string;
  dotClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
      <span>{label}</span>
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
    </span>
  );
}

function Pill({ label, active = false }: { label: string; active?: boolean }) {
  if (active) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700"
      >
        <WorkspaceBadge className="h-3 w-3 text-green-600" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sort selector — funnel icon + clickable disclosure menu
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
        className="flex items-center gap-2 text-[12px] text-gray-700 hover:text-gray-900"
      >
        <FilterIcon className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-gray-500">Filter:</span>
        <span className="font-medium">{SORT_LABELS[value]}</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-md">
          <SortOption
            label="Recently"
            selected={value === "recent"}
            onClick={() => {
              onChange("recent");
              setOpen(false);
            }}
          />
          <SortOption
            label="Confidence level"
            selected={value === "confidence"}
            onClick={() => {
              onChange("confidence");
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SortOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 ${
        selected ? "font-medium text-gray-900" : "text-gray-700"
      }`}
    >
      <span>{label}</span>
      {selected ? <span className="text-blue-500">✓</span> : null}
    </button>
  );
}
