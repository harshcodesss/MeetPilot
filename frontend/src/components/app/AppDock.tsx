"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  Calendar,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Puzzle,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { clearToken } from "@/lib/auth";

/**
 * Experiment: a floating, vertical macOS-style dock replacing the sidebar.
 *
 * Adapted from `ui/floating-dock.tsx` (which magnifies horizontally on mouseX)
 * to magnify VERTICALLY on mouseY — icons swell as the cursor moves up/down the
 * rail. It floats fixed on the left, vertically centered; tooltips fan out to
 * the right. The app shell gives the main pane left padding so content clears
 * the dock.
 */

const EXPAND = 150; // px of cursor proximity over which an icon grows
const SIZE_REST = 40;
const SIZE_PEAK = 80;
const ICON_REST = 20;
const ICON_PEAK = 40;

type ActiveColor = "blue" | "yellow" | "green" | "red";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  color: ActiveColor;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: Home, color: "blue" },
  { href: "/meetings", label: "Meetings", icon: Video, color: "yellow" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, color: "green" },
  { href: "/calendar", label: "Calendar", icon: Calendar, color: "red" },
  { href: "/extension", label: "Extension", icon: Puzzle, color: "blue" },
  { href: "/settings", label: "Settings", icon: Settings, color: "red" },
  { href: "/help", label: "Help", icon: FileText, color: "yellow" },
];

const ACTIVE_VARIANTS: Record<ActiveColor, string> = {
  blue: "bg-blue-500 text-white",
  yellow: "bg-yellow-300 text-gray-900",
  green: "bg-green-600 text-white",
  red: "bg-red-500 text-white",
};

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppDock() {
  const mouseY = useMotionValue(Infinity);
  const pathname = usePathname();
  const router = useRouter();

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="fixed left-4 top-1/2 z-50 -translate-y-1/2">
      <motion.div
        onMouseMove={(e) => mouseY.set(e.pageY)}
        onMouseLeave={() => mouseY.set(Infinity)}
        // Fixed width — the box never widens. Icons magnify and pop OUT of the
        // box (overflow visible); only the box height changes with the stack.
        className="flex w-16 flex-col items-center gap-3 rounded-[28px] border border-gray-200 bg-white/90 py-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md"
      >
        {/* Brand — click returns to the landing page */}
        <Link href="/" aria-label="MeetPilot home" className="group/logo">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-lg font-bold text-white transition-transform group-hover/logo:scale-110">
            M
          </span>
        </Link>

        <div className="h-px w-7 bg-gray-200" />

        {/* Nav icons */}
        {NAV_ITEMS.map((item) => (
          <DockIcon
            key={item.href}
            mouseY={mouseY}
            label={item.label}
            Icon={item.icon}
            href={item.href}
            color={item.color}
            active={isActive(pathname, item.href)}
          />
        ))}

        <div className="h-px w-7 bg-gray-200" />

        {/* Sign out */}
        <DockIcon
          mouseY={mouseY}
          label="Sign out"
          Icon={LogOut}
          onClick={onLogout}
          danger
        />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single dock icon — grows as the cursor nears it along the Y axis.
// ---------------------------------------------------------------------------

function DockIcon({
  mouseY,
  label,
  Icon,
  href,
  onClick,
  active = false,
  color,
  danger = false,
}: {
  mouseY: MotionValue<number>;
  label: string;
  Icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  color?: ActiveColor;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseY, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  const sizeT = useTransform(distance, [-EXPAND, 0, EXPAND], [SIZE_REST, SIZE_PEAK, SIZE_REST]);
  const iconT = useTransform(distance, [-EXPAND, 0, EXPAND], [ICON_REST, ICON_PEAK, ICON_REST]);

  const spring = { mass: 0.1, stiffness: 150, damping: 12 };
  const size = useSpring(sizeT, spring);
  const iconSize = useSpring(iconT, spring);

  const [hovered, setHovered] = useState(false);

  const base = active
    ? ACTIVE_VARIANTS[color ?? "blue"]
    : danger
      ? "bg-red-50 text-red-600 hover:bg-red-100"
      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900";

  const body = (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex aspect-square items-center justify-center rounded-full transition-colors ${base}`}
    >
      {/* Tooltip — fans out to the right of the dock. */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: -6, y: "-50%" }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0, x: -6, y: "-50%" }}
            className="pointer-events-none absolute left-full top-1/2 ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.div
        style={{ width: iconSize, height: iconSize }}
        className="flex items-center justify-center"
      >
        <Icon className="h-full w-full" strokeWidth={active ? 2 : 1.6} />
      </motion.div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label}>
      {body}
    </button>
  );
}
