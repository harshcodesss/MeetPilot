"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { clearToken } from "@/lib/auth";

/**
 * Collapsible sidebar — macOS-inspired, fixed height, no scroll on the
 * sidebar itself (the AppLayout pins `h-screen` + `overflow-hidden` on the
 * shell; the main pane scrolls).
 *
 *   ┌── traffic-light decoration ─────────────────────────────┐
 *   │  • • •                                                   │
 *   │  [logo]  MeetPilot              [⮜ / ⮞ toggle]            │
 *   │                                                          │
 *   │  [icon] Dashboard                                        │
 *   │  [icon] Meetings                                         │
 *   │  ...                                                     │
 *   │                                                          │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  [icon] Sign out                                         │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Expanded ≈ 240px. Collapsed ≈ 72px (icons only + tooltips on hover).
 * Animation: framer-motion width tween. Active state: light green pill
 * (matches the brand logo's green checkmarks).
 */

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

type ActiveColor = "blue" | "yellow" | "green" | "red";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  color: ActiveColor;
}> = [
  // Harsh-assigned: dashboard=blue, meetings=yellow, tasks=green, calendar=red.
  // Last two are my call: settings=blue (system/utility feel), help=yellow
  // (info/docs feel) — picks let the active palette echo the top 4 cleanly.
  { href: "/dashboard", label: "Dashboard", icon: Home, color: "blue" },
  { href: "/meetings", label: "Meetings", icon: Video, color: "yellow" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, color: "green" },
  { href: "/calendar", label: "Calendar", icon: Calendar, color: "red" },
  { href: "/settings", label: "Settings", icon: Settings, color: "blue" },
  { href: "/help", label: "Help", icon: FileText, color: "yellow" },
];

// Active-state colour variants. Tweaked from the original 500/400 set —
// green-500 felt too vivid, yellow-400 felt too dark/golden. Green nudged
// deeper to green-600 (white text reads cleanly), yellow nudged lighter to
// yellow-300 (still wants dark text for AA contrast).
const ACTIVE_VARIANTS: Record<ActiveColor, string> = {
  blue: "bg-blue-500 text-white",
  yellow: "bg-yellow-300 text-gray-900",
  green: "bg-green-600 text-white",
  red: "bg-red-500 text-white",
};

// Icon system (locked):
//   - 20px (h-5 w-5) by default
//   - strokeWidth 1.5 for inactive, 2.0 when active
//   - inactive items use text-gray-500/70; active items use solid text-gray-900
const ICON_STROKE = 1.5;
const ICON_STROKE_ACTIVE = 2;

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <motion.aside
      animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      initial={false}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white"
    >
      {/* Brand row — logo + name (expanded) or just centered logo (collapsed) */}
      <div
        className={`flex items-center gap-2.5 px-3 pt-5 pb-3 ${expanded ? "" : "justify-center"}`}
      >
        <Image
          src="/logo_website.png"
          alt="MeetPilot"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 object-contain"
        />
        {expanded ? (
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-gray-900">
            MeetPilot
          </span>
        ) : null}
      </div>

      {/* Nav stack */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            active={isActive(pathname, item.href)}
            expanded={expanded}
            color={item.color}
          />
        ))}
      </nav>

      {/* Expand / collapse — sits between the nav and sign-out, doubling as a
          visual separator from the main items. */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 ${
            expanded ? "" : "justify-center"
          }`}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            <ChevronLeft
              className="h-5 w-5 shrink-0"
              strokeWidth={ICON_STROKE}
            />
          ) : (
            <ChevronRight
              className="h-5 w-5 shrink-0"
              strokeWidth={ICON_STROKE}
            />
          )}
          {expanded ? (
            <span className="whitespace-nowrap text-[13px] font-normal">
              Collapse
            </span>
          ) : null}
          {!expanded ? <Tooltip label="Expand" /> : null}
        </button>
      </div>

      {/* Sign out — pinned to bottom */}
      <div className="border-t border-gray-200 px-3 py-3">
        <SidebarAction
          onClick={onLogout}
          label="Sign out"
          Icon={LogOut}
          expanded={expanded}
        />
      </div>
    </motion.aside>
  );
}

// ---------------------------------------------------------------------------
// Single nav item — link with icon, label (when expanded), tooltip (when not)
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  expanded: boolean;
  color: ActiveColor;
}

function SidebarItem({
  href,
  label,
  Icon,
  active,
  expanded,
  color,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
        expanded ? "" : "justify-center"
      } ${
        active
          ? ACTIVE_VARIANTS[color]
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        strokeWidth={active ? ICON_STROKE_ACTIVE : ICON_STROKE}
      />
      {expanded ? (
        <span
          className={`whitespace-nowrap text-[13px] ${active ? "font-medium" : "font-normal"}`}
        >
          {label}
        </span>
      ) : null}
      {!expanded ? <Tooltip label={label} /> : null}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sign-out — button shape, same look as SidebarItem
// ---------------------------------------------------------------------------

interface SidebarActionProps {
  onClick: () => void;
  label: string;
  Icon: LucideIcon;
  expanded: boolean;
}

function SidebarAction({ onClick, label, Icon, expanded }: SidebarActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50 ${
        expanded ? "" : "justify-center"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={ICON_STROKE} />
      {expanded ? (
        <span className="whitespace-nowrap text-[13px] font-medium">{label}</span>
      ) : null}
      {!expanded ? <Tooltip label={label} /> : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Hover tooltip — only rendered in collapsed mode, CSS-driven opacity.
// ---------------------------------------------------------------------------

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}
