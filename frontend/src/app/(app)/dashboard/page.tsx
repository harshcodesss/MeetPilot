"use client";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FlipBoardHero } from "@/components/app/FlipBoardHero";
import { InstallSteps } from "@/components/app/InstallSteps";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { bucketFor } from "@/lib/buckets";
import {
  addDays,
  addMonths,
  buildMonthCells,
  formatYmd,
  monthLabel,
  parseLocalDate,
  startOfMonth,
  todayLocal,
} from "@/lib/calendar";
import type { Confidence, Session, Stats, Task } from "@/types";

/**
 * Dashboard — the first impression. Top row: four stat cards each with a small
 * animated 7-day bar graph. Middle row: recent meetings · task-progress ring ·
 * an interactive mini calendar. Then the full tasks table. White background;
 * cards carry the colour.
 */

interface UserOut {
  user_id: string;
  email: string;
  display_name: string;
}

interface LoadingState {
  status: "loading";
}
interface LoadedState {
  status: "loaded";
  stats: Stats;
  sessions: Session[];
  tasks: Task[];
  user: UserOut;
}
interface ErrorState {
  status: "error";
  message: string;
}
type PageState = LoadingState | LoadedState | ErrorState;

export default function DashboardPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setPageState({ status: "loading" });

    void Promise.all([
      api.get<Stats>("/me/stats"),
      api.get<Session[]>("/me/sessions"),
      api.get<Task[]>("/me/tasks"),
      api.get<UserOut>("/me"),
    ])
      .then(([stats, sessions, tasks, user]) => {
        if (cancelled) return;
        setPageState({ status: "loaded", stats, sessions, tasks, user });
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
            Couldn’t load your dashboard
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{pageState.message}</p>
        </Card>
      </div>
    );
  }

  const { stats, sessions, tasks, user } = pageState;

  // First-run: nothing captured yet. Lead with the extension setup.
  if (sessions.length === 0) {
    return (
      <div className="space-y-8">
        <Header user={user} />
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header user={user} />

      <StatTiles stats={stats} sessions={sessions} tasks={tasks} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentMeetings sessions={sessions} />
        <TaskProgress tasks={tasks} />
        <MiniCalendar tasks={tasks} />
      </div>

      <TasksTable tasks={tasks} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding — first-run setup, shown until the first meeting is captured
// ---------------------------------------------------------------------------

const ONBOARDING_MESSAGES = [
  "WELCOME \nABOARD \n{B}{G}{Y}{R}",
  "LET'S GET \nYOU SET UP",
  "INSTALL ONCE \nFORGET NEVER",
  "YOUR MEETINGS \nARE ABOUT TO \nGET ORGANIZED",
];

function Onboarding() {
  return (
    <section className="mx-auto max-w-5xl space-y-10">
      {/* Hero stays in a centered narrow column (mirrors the Extension page). */}
      <div className="mx-auto max-w-xl">
        <FlipBoardHero messages={ONBOARDING_MESSAGES} />
      </div>

      {/* Title + the install/connect flow, grouped together. */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Let’s get you set up
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Install the MeetPilot extension and connect it to your account — your
          next Google Meet captures itself and this page fills up.
        </p>
        <div className="mt-3">
          <InstallSteps />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Header — brand icon circle + greeting, date pill at right
// ---------------------------------------------------------------------------

function Header({ user }: { user: UserOut }) {
  const now = new Date();
  const month = now.toLocaleDateString(undefined, { month: "short" });
  const day = now.getDate();
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const full = now.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-white shadow-soft">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Welcome, {firstName(user.display_name)}
          </h1>
          <p className="text-sm text-ink-muted">
            Here’s everything your meetings volunteered you for.
          </p>
        </div>
      </div>

      {/* Tear-off calendar chip — month strip + day number, with the weekday
          and full date alongside. No surrounding box; the glyph carries it. */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 flex-col overflow-hidden rounded-lg border border-line">
          <div className="bg-primary text-center text-[9px] font-bold uppercase leading-[14px] tracking-wider text-white">
            {month}
          </div>
          <div className="flex flex-1 items-center justify-center text-lg font-bold leading-none text-ink">
            {day}
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{weekday}</div>
          <div className="text-xs text-ink-muted">{full}</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tiles — four cards, each with a number, label, and animated 7-day bars
// ---------------------------------------------------------------------------

type AccentKey = "blue" | "yellow" | "green" | "red";

// Per-card theming for the coloured stat cards. Blue/green/red carry white
// content; the bright yellow card flips to dark content for contrast. `light`
// tells the graph which palette to draw in (white vs ink).
interface Accent {
  card: string;
  heading: string;
  number: string;
  arrow: string;
  chip: string;
  label: string;
  light: boolean;
}

const ACCENT: Record<AccentKey, Accent> = {
  blue: {
    card: "bg-gradient-to-br from-[#1a73e8] to-[#1765cc]",
    heading: "text-white/85",
    number: "text-white",
    arrow: "border-white/45 text-white group-hover:bg-white/20",
    chip: "bg-white/15 text-white",
    label: "text-white/75",
    light: true,
  },
  yellow: {
    card: "bg-gradient-to-br from-[#fdca2c] to-[#fbbc04]",
    heading: "text-white/90",
    number: "text-white",
    arrow: "border-white/55 text-white group-hover:bg-white/20",
    chip: "bg-white/20 text-white",
    label: "text-white/85",
    light: true,
  },
  green: {
    card: "bg-gradient-to-br from-[#34a853] to-[#2a9248]",
    heading: "text-white/85",
    number: "text-white",
    arrow: "border-white/45 text-white group-hover:bg-white/20",
    chip: "bg-white/15 text-white",
    label: "text-white/80",
    light: true,
  },
  red: {
    card: "bg-gradient-to-br from-[#ea4335] to-[#d33729]",
    heading: "text-white/85",
    number: "text-white",
    arrow: "border-white/45 text-white group-hover:bg-white/20",
    chip: "bg-white/15 text-white",
    label: "text-white/80",
    light: true,
  },
};

function StatTiles({
  stats,
  sessions,
  tasks,
}: {
  stats: Stats;
  sessions: Session[];
  tasks: Task[];
}) {
  // A task's `created_at` is the DB insert time (all "now" for seeded/batch
  // extraction), which would pile every task onto today. Bucket by the task's
  // meeting date (session.started_at) instead — that's when it actually arose.
  const taskDates = useMemo(() => {
    const when: Record<string, string> = {};
    for (const s of sessions) when[s.session_id] = s.started_at;
    const dateOf = (t: Task) => when[t.session_id] ?? t.created_at;
    return {
      all: tasks.map(dateOf),
      drafted: tasks.filter((t) => bucketFor(t) === "drafted").map(dateOf),
      action: tasks.filter((t) => bucketFor(t) === "awaiting").map(dateOf),
    };
  }, [sessions, tasks]);

  const series = useMemo(
    () => ({ tasks: dailyCounts(taskDates.all) }),
    [taskDates],
  );

  // Urgency split of the action-required tasks for that card's graph.
  const urgency = useMemo(() => {
    const today = formatYmd(todayLocal());
    const u = { overdue: 0, dueToday: 0, later: 0 };
    for (const t of tasks) {
      if (bucketFor(t) !== "awaiting") continue;
      const d = t.deadline_date;
      if (!d) u.later++;
      else if (d < today) u.overdue++;
      else if (d === today) u.dueToday++;
      else u.later++;
    }
    return u;
  }, [tasks]);

  // Week-over-week change (last 7 days vs the 7 before) for the trend footer.
  const deltas = useMemo(
    () => ({
      meetings: weekDelta(sessions.map((s) => s.started_at)),
      tasks: weekDelta(taskDates.all),
      drafted: weekDelta(taskDates.drafted),
      action: weekDelta(taskDates.action),
    }),
    [sessions, taskDates],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        accent="blue"
        href="/meetings"
        value={stats.meetings_this_week}
        label="Meetings"
        delta={deltas.meetings}
        graph={<WeekHeat sessions={sessions} light />}
      />
      <StatTile
        accent="yellow"
        href="/tasks"
        value={stats.tasks_this_week}
        label="Tasks"
        delta={deltas.tasks}
        graph={<Histogram data={series.tasks} light />}
      />
      <StatTile
        accent="green"
        href="/tasks"
        value={stats.drafts_ready}
        label="Drafted"
        delta={deltas.drafted}
        graph={<Gauge drafted={stats.drafts_ready} total={tasks.length} light />}
      />
      <StatTile
        accent="red"
        href="/tasks"
        value={stats.action_required}
        label="Action Required"
        delta={deltas.action}
        graph={
          <UrgencyBars
            overdue={urgency.overdue}
            dueToday={urgency.dueToday}
            later={urgency.later}
            light
          />
        }
      />
    </div>
  );
}

function StatTile({
  accent,
  href,
  value,
  label,
  delta,
  graph,
}: {
  accent: AccentKey;
  href: string;
  value: number;
  label: string;
  delta: number;
  graph: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md ${a.card}`}
    >
      {/* Row 1 — heading (left) · circular arrow (right) */}
      <div className="flex items-center justify-between gap-3">
        <span className={`truncate text-sm font-medium ${a.heading}`}>
          {label}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${a.arrow}`}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      {/* Row 2 — big number (left) · graph (right). Fixed height + bottom
          align so the heatmap card lines up with the other cards. */}
      <div className="mt-3 flex h-14 items-end justify-between gap-3">
        <span
          className={`text-5xl font-bold leading-none tracking-tight ${a.number}`}
        >
          {value}
        </span>
        {graph}
      </div>
      {/* Row 3 — week-over-week trend */}
      <StatTrend delta={delta} chip={a.chip} label={a.label} />
    </Link>
  );
}

// Trend footer — a translucent delta chip (▲/▼ + amount) and a caption,
// mirroring the reference's "Increased from last month" row. Period is a week
// here since the cards count this week's activity. Direction is read from the
// glyph + wording, so the chip colour can stay neutral on the coloured card.
const TREND_LABEL: Record<"up" | "down" | "flat", string> = {
  up: "Increased from last week",
  down: "Decreased from last week",
  flat: "No change from last week",
};

function StatTrend({
  delta,
  chip,
  label,
}: {
  delta: number;
  chip: string;
  label: string;
}) {
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <div className="mt-4 flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${chip}`}
      >
        {dir !== "flat" && (
          <svg width="7" height="7" viewBox="0 0 8 8" aria-hidden>
            <polygon
              points={dir === "up" ? "4,0 8,8 0,8" : "0,0 8,0 4,8"}
              fill="currentColor"
            />
          </svg>
        )}
        {Math.abs(delta)}
      </span>
      <span className={`truncate text-xs ${label}`}>{TREND_LABEL[dir]}</span>
    </div>
  );
}

// Last-7-days bar histogram — one bar per day, height scaled to the busiest
// day. Bars grow in left-to-right; empty days show a faint stub. Hovering a bar
// pops a dark tooltip (weekday + count), matching the Meetings heatmap.
function Histogram({ data, light = false }: { data: number[]; light?: boolean }) {
  const max = Math.max(1, ...data);
  const [hovered, setHovered] = useState<number | null>(null);
  const start = addDays(todayLocal(), -(data.length - 1));
  const color = light ? "#ffffff" : "rgba(0,0,0,0.72)";
  return (
    <div className="flex h-14 w-24 shrink-0 items-end justify-between gap-1">
      {data.map((v, i) => {
        const label = addDays(start, i).toLocaleDateString(undefined, {
          weekday: "short",
        });
        return (
          <div
            key={i}
            className="relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === i ? (
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-md">
                {label}: {v} {v === 1 ? "task" : "tasks"}
              </span>
            ) : null}
            <motion.span
              className="w-full cursor-default rounded-sm"
              style={{
                backgroundColor: color,
                opacity: v === 0 ? 0.18 : hovered === i ? 1 : 0.85,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((v / max) * 100, 6)}%` }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease: "easeOut" }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Semicircle progress gauge (PieChart.png) — a 180° arc with a light track for
// the whole, a green fill for the drafted share, and the drafted/total
// percentage in the centre. The fill sweeps in on load.
function Gauge({
  drafted,
  total,
  light = false,
}: {
  drafted: number;
  total: number;
  light?: boolean;
}) {
  const frac = total > 0 ? Math.min(drafted / total, 1) : 0;
  const pct = Math.round(frac * 100);

  const CX = 50;
  const CY = 50;
  const R = 40;
  const SW = 11;
  const START = -90; // left end of the diameter
  const SPAN = 180; // sweep over the top to the right end
  const end = START + frac * SPAN;

  const track = light ? "rgba(255,255,255,0.3)" : "#e6eaef";
  const fill = light ? "#ffffff" : "#34a853";
  const pctFill = light ? "rgba(255,255,255,0.95)" : "var(--color-ink-muted)";

  return (
    <svg viewBox="0 0 100 60" className="h-14 w-24 shrink-0">
      {/* Track — the full semicircle (remaining = not drafted) */}
      <path
        d={arcPath(CX, CY, R, START, START + SPAN)}
        fill="none"
        stroke={track}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      {/* Fill — the drafted share */}
      {frac > 0 && (
        <motion.path
          d={arcPath(CX, CY, R, START, end)}
          fill="none"
          stroke={fill}
          strokeWidth={SW}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
      {/* Centre percentage */}
      <text
        x={CX}
        y={CY - 2}
        textAnchor="middle"
        fontSize="17"
        fontWeight={600}
        fill={pctFill}
      >
        {pct}%
      </text>
    </svg>
  );
}

// Point on a circle, angle in degrees measured clockwise from the top.
function gaugePoint(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

// SVG arc path from startDeg to endDeg (clockwise), same angle convention.
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const [sx, sy] = gaugePoint(cx, cy, r, startDeg);
  const [ex, ey] = gaugePoint(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

// Urgency breakdown for the Action Required card — three proportional bars
// (Overdue / Today / Later) over the action-required tasks, scaled to the
// busiest bucket. Bars sweep in; empty buckets keep their track for context.
function UrgencyBars({
  overdue,
  dueToday,
  later,
  light = false,
}: {
  overdue: number;
  dueToday: number;
  later: number;
  light?: boolean;
}) {
  // On a coloured card the three rows are distinguished by opacity (urgency
  // fades down the list); off-card they keep their semantic red/amber/slate.
  const rows = [
    { label: "Overdue", color: "#ea4335", count: overdue, fade: 1 },
    { label: "Today", color: "#fbbc04", count: dueToday, fade: 0.7 },
    { label: "Later", color: "#94a3b8", count: later, fade: 0.45 },
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="flex w-28 shrink-0 flex-col justify-center gap-1.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-1.5">
          <span
            className={`w-9 text-[9px] font-medium ${
              light ? "text-white/85" : "text-ink-muted"
            }`}
          >
            {r.label}
          </span>
          <div
            className={`h-1.5 flex-1 overflow-hidden rounded-full ${
              light ? "bg-white/20" : "bg-black/[0.06]"
            }`}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: light ? "#ffffff" : r.color,
                opacity: light ? r.fade : 1,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(r.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: "easeOut" }}
            />
          </div>
          <span
            className={`w-2 text-right text-[10px] font-semibold tabular-nums ${
              light ? "text-white" : "text-ink"
            }`}
          >
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// Weekly heat strip — last 7 days as evenly spaced day squares with weekday
// initials, coloured by meeting count. Sits in the Meetings card's graph slot.
function WeekHeat({
  sessions,
  light = false,
}: {
  sessions: Session[];
  light?: boolean;
}) {
  const days = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      const d = new Date(s.started_at);
      d.setHours(0, 0, 0, 0);
      counts[formatYmd(d)] = (counts[formatYmd(d)] ?? 0) + 1;
    }
    const start = addDays(todayLocal(), -6);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        ymd: formatYmd(date),
        count: counts[formatYmd(date)] ?? 0,
        initial: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      };
    });
  }, [sessions]);

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex shrink-0 items-end gap-1">
      {days.map((day, i) => (
        <div
          key={day.ymd}
          className="relative flex w-3 flex-col items-center gap-1"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          {hovered === i ? (
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {day.count} {day.count === 1 ? "meeting" : "meetings"}
            </span>
          ) : null}
          <span
            className={`h-7 w-full cursor-pointer rounded-sm shadow-sm transition-all hover:scale-125 hover:ring-2 ${
              light ? "hover:ring-white/60" : "hover:ring-primary/40"
            } ${heatClass(day.count, light)}`}
          />
          <span
            className={`text-[8px] font-medium leading-none ${
              light ? "text-white/70" : "text-ink-faint"
            }`}
          >
            {day.initial}
          </span>
        </div>
      ))}
    </div>
  );
}

function heatClass(count: number, light = false): string {
  if (light) {
    if (count <= 0) return "bg-white/20";
    if (count === 1) return "bg-white/45";
    if (count === 2) return "bg-white/70";
    return "bg-white";
  }
  if (count <= 0) return "bg-black/[0.06]";
  if (count === 1) return "bg-primary/40";
  if (count === 2) return "bg-primary/70";
  return "bg-primary";
}

// ---------------------------------------------------------------------------
// Recent meetings — newest three, compact rows
// ---------------------------------------------------------------------------

function RecentMeetings({ sessions }: { sessions: Session[] }) {
  const recent = sessions.slice(0, 5);
  return (
    <section>
      <div className="flex h-full flex-col rounded-2xl border border-line bg-white shadow-soft">
        <CardHead title="Recent meetings" href="/meetings" />
        {/* Rows flex-grow to fill the card, so it looks full with 1 or 5. */}
        <div className="flex flex-1 flex-col divide-y divide-line">
          {recent.map((s) => (
            <Link
              key={s.session_id}
              href={`/meetings/${s.session_id}`}
              className="flex flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Video className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {s.title ?? "Untitled meeting"}
                </div>
                <div className="text-xs text-ink-muted">
                  {formatDateTime(s.started_at)}
                </div>
              </div>
              <Badge tone={s.status === "active" ? "info" : "success"}>
                {s.status}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Task progress — animated completion ring + legend
// ---------------------------------------------------------------------------

function TaskProgress({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    const c = { drafted: 0, awaiting: 0, done: 0 };
    for (const t of tasks) {
      const b = bucketFor(t);
      if (b === "drafted") c.drafted++;
      else if (b === "awaiting") c.awaiting++;
      else if (b === "done") c.done++;
    }
    return c;
  }, [tasks]);

  const total = counts.drafted + counts.awaiting + counts.done;

  return (
    <section>
      <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Task progress</h2>
          <span className="text-xs text-ink-muted">{total} total</span>
        </div>
        <ProgressGauge
          drafted={counts.drafted}
          awaiting={counts.awaiting}
          done={counts.done}
          total={total}
        />
        <div className="mt-5 space-y-2.5">
          <LegendRow dot="bg-primary" label="Drafted" count={counts.drafted} />
          <LegendRow dot="bg-yellow" label="Action required" count={counts.awaiting} />
          <LegendRow dot="bg-green" label="Finished" count={counts.done} />
        </div>
      </div>
    </section>
  );
}

// Full three-segment donut — drafted → action required → finished, each sized
// to its share of the whole, with rounded ends and a gap between slices
// (Fresh_templates style). Arcs draw in sequentially; hovering a slice pops it
// out, dims the rest, and shows that slice's label + count in the centre.
function ProgressGauge({
  drafted,
  awaiting,
  done,
  total,
}: {
  drafted: number;
  awaiting: number;
  done: number;
  total: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const R = 46;
  const C = 2 * Math.PI * R;
  const SW = 8; // base stroke width
  const GAP = 10; // length units removed per slice → small visible gap after caps

  const segments = [
    { value: drafted, color: "#1a73e8", label: "Drafted" },
    { value: awaiting, color: "#fbbc04", label: "Action required" },
    { value: done, color: "#34a853", label: "Finished" },
  ].filter((s) => s.value > 0);

  const active = hovered != null ? segments[hovered] : null;
  let acc = 0;

  return (
    <div
      className="relative mx-auto mt-2 h-32 w-32"
      onMouseLeave={() => setHovered(null)}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {total > 0 &&
          segments.map((s, i) => {
            const slot = (s.value / total) * C;
            const len = Math.max(slot - GAP, 1);
            const startAngle = ((acc + GAP / 2) / C) * 360;
            acc += slot;
            const isHover = hovered === i;
            return (
              <g key={i} transform={`rotate(${startAngle} 60 60)`}>
                <motion.circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${C}`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(i)}
                  initial={{ strokeDashoffset: len, strokeWidth: SW, opacity: 1 }}
                  animate={{
                    strokeDashoffset: 0,
                    strokeWidth: isHover ? 11 : SW,
                    opacity: hovered === null || isHover ? 1 : 0.35,
                  }}
                  transition={{
                    strokeDashoffset: {
                      duration: 0.8,
                      delay: 0.15 + i * 0.18,
                      ease: "easeOut",
                    },
                    strokeWidth: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                  }}
                />
              </g>
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {active ? (
          <>
            <span
              className="text-3xl font-bold tracking-tight"
              style={{ color: active.color }}
            >
              {active.value}
            </span>
            <span className="text-xs text-ink-muted">{active.label}</span>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold tracking-tight text-ink">
              {total}
            </span>
            <span className="text-xs text-ink-muted">
              {total === 1 ? "task" : "tasks"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function LegendRow({
  dot,
  label,
  count,
}: {
  dot: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="text-sm font-semibold text-ink">{count}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini calendar — interactive: month nav, deadline dots, animated day select
// ---------------------------------------------------------------------------

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCalendar({ tasks }: { tasks: Task[] }) {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(todayLocal()));
  const [selected, setSelected] = useState<string>(() =>
    formatYmd(todayLocal()),
  );

  const byYmd = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.deadline_date) continue;
      (m[t.deadline_date] ??= []).push(t);
    }
    return m;
  }, [tasks]);

  // Drop the trailing 6th week when it's entirely next-month padding, so the
  // grid hugs the real month instead of always showing a spare row.
  const cells = useMemo(() => {
    const all = buildMonthCells(anchor);
    return all.slice(35).every((c) => !c.inMonth) ? all.slice(0, 35) : all;
  }, [anchor]);
  const dueCount = byYmd[selected]?.length ?? 0;

  return (
    <section>
      <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{monthLabel(anchor)}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setAnchor((a) => addMonths(a, -1))}
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setAnchor((a) => addMonths(a, 1))}
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center">
          {WEEKDAY_INITIALS.map((d, i) => (
            <span key={i} className="text-[10px] font-medium text-ink-faint">
              {d}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7">
          {cells.map((cell) => {
            const dayTasks = byYmd[cell.ymd] ?? [];
            const confs = CONFIDENCE_ORDER.filter((c) =>
              dayTasks.some((t) => t.confidence === c),
            );
            const isToday = cell.position === "today";
            const isSelected = selected === cell.ymd;
            return (
              <button
                key={cell.ymd}
                type="button"
                onClick={() => setSelected(cell.ymd)}
                className="relative mx-auto flex h-9 w-9 flex-col items-center justify-center gap-0.5"
              >
                <span className="relative flex h-7 w-7 items-center justify-center">
                  {isSelected ? (
                    <motion.span
                      layoutId="cal-selected"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  ) : isToday ? (
                    <span className="absolute inset-0 rounded-full ring-1 ring-primary/40" />
                  ) : null}
                  <span
                    className={`relative z-10 text-xs transition-colors ${
                      isSelected
                        ? "font-semibold text-white"
                        : isToday
                          ? "font-semibold text-primary"
                          : cell.inMonth
                            ? "text-ink"
                            : "text-ink-faint"
                    }`}
                  >
                    {cell.day}
                  </span>
                </span>
                {/* Up to three dots — one per distinct confidence due that day. */}
                <span className="flex h-1.5 items-center justify-center gap-0.5">
                  {confs.map((c) => (
                    <span
                      key={c}
                      className={`h-1 w-1 rounded-full ${DOT_BY_CONFIDENCE[c]}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto border-t border-line pt-3 text-xs text-ink-muted">
          {dueCount === 0 ? (
            <span className="text-ink-faint">Nothing due {prettyDay(selected)}.</span>
          ) : (
            <span>
              <span className="font-semibold text-ink">{dueCount}</span>{" "}
              {dueCount === 1 ? "task" : "tasks"} due {prettyDay(selected)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tasks table — every task, click through to the meeting detail
// ---------------------------------------------------------------------------

function TasksTable({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  return (
    <section>
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <CardHead title="Tasks" href="/tasks" />
        {tasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            No tasks yet. Capture a meeting to see action items here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Assignee</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Confidence</th>
                  <th className="px-5 py-2.5 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.map((t) => {
                  const status = statusBadge(t);
                  return (
                    <tr
                      key={t.task_id}
                      onClick={() =>
                        router.push(`/meetings/${t.session_id}#task-${t.task_id}`)
                      }
                      className="cursor-pointer transition-colors hover:bg-surface"
                    >
                      <td className="max-w-[360px] px-5 py-3">
                        <div className="truncate font-medium text-ink">
                          {t.action}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{t.assignee}</td>
                      <td className="px-3 py-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <span
                            className={`h-2 w-2 rounded-full ${DOT_BY_CONFIDENCE[t.confidence]}`}
                          />
                          <span className="capitalize">{t.confidence}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {t.deadline_date ? formatDate(t.deadline_date) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function CardHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <Link
        href={href}
        className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
      >
        See all →
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOT_BY_CONFIDENCE: Record<Confidence, string> = {
  high: "bg-green",
  moderate: "bg-yellow",
  low: "bg-red",
};

// Fixed render order for the calendar's per-day confidence dots.
const CONFIDENCE_ORDER: Confidence[] = ["high", "moderate", "low"];

type BadgeTone = "neutral" | "info" | "success" | "warn" | "danger";

function statusBadge(task: Task): { label: string; tone: BadgeTone } {
  const b = bucketFor(task);
  if (b === "drafted") return { label: "Drafted", tone: "success" };
  if (b === "awaiting") return { label: "Action Required", tone: "danger" };
  if (b === "suggested") return { label: "Suggested", tone: "info" };
  if (b === "done") return { label: "Done", tone: "neutral" };
  return { label: "Pending", tone: "neutral" };
}

// Net change between this week and last (count in days 0–6 minus days 7–13).
// Positive = up week-over-week. Drives the trend footer chip.
function weekDelta(isoDates: string[]): number {
  const today = todayLocal().getTime();
  return isoDates.reduce((acc, iso) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today - d.getTime()) / 86_400_000);
    if (diff >= 0 && diff < 7) return acc + 1;
    if (diff >= 7 && diff < 14) return acc - 1;
    return acc;
  }, 0);
}

// Counts per day over the last `days` days, oldest first (for the sparkbars).
function dailyCounts(isoDates: string[], days = 7): number[] {
  const today = todayLocal().getTime();
  const out = new Array<number>(days).fill(0);
  for (const iso of isoDates) {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today - d.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) out[days - 1 - diff] += 1;
  }
  return out;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? "there";
}

function prettyDay(ymd: string): string {
  const d = parseLocalDate(ymd);
  if (ymd === formatYmd(todayLocal())) return "today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return `Couldn’t load the dashboard (HTTP ${err.status}).`;
  }
  return "Couldn’t load the dashboard. Please check your connection.";
}
