"use client";

import {
  AlertTriangle,
  ChevronDown,
  ListChecks,
  PencilLine,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ExtensionConnect } from "@/components/app/ExtensionConnect";
import { FlipBoardHero } from "@/components/app/FlipBoardHero";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError, api } from "@/lib/api";
import { bucketFor } from "@/lib/buckets";
import { startOfMonth, startOfWeek, todayLocal } from "@/lib/calendar";
import type { Confidence, Session, Stats, Task } from "@/types";

/**
 * Dashboard — the first impression. Layout follows dashboard_layout.png:
 * a header (title + user), four colored stat tiles, a row of [recent meetings
 * | tasks status], and a full-width tasks table (styled per dashboard_image).
 *
 * Four parallel fetches; all-or-nothing on load.
 */

interface UserOut {
  user_id: string;
  email: string;
  display_name: string;
}

type Timeframe = "today" | "week" | "month";
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
};

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
  const [timeframe, setTimeframe] = useState<Timeframe>("month");

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

  // First-run: nothing captured yet. Lead with the extension setup instead of
  // a wall of empty stats/tables. This card self-dismisses once the user has
  // captured their first meeting.
  if (sessions.length === 0) {
    return (
      <div className="space-y-8">
        <Header user={user} />
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header user={user} />

      <StatTiles stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentMeetings sessions={sessions} />
        <TasksStatus
          tasks={tasks}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
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
    <section className="mx-auto max-w-2xl space-y-6">
      <FlipBoardHero messages={ONBOARDING_MESSAGES} />
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Let’s get you set up 👋
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Install the MeetPilot extension and connect it to your account — then
          your next Google Meet gets captured automatically, and this page fills
          up with your meetings and tasks.
        </p>
      </div>
      <ExtensionConnect showHeading={false} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Header — title + funny line on the left, avatar + username on the right
// ---------------------------------------------------------------------------

function Header({ user }: { user: UserOut }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Welcome back — here’s everything your meetings volunteered you for.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-ink">
            {user.display_name}
          </div>
          <div className="text-xs text-ink-muted">{user.email}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {initials(user.display_name)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tiles — four colored cards (meetings / tasks / drafted / action req.)
// ---------------------------------------------------------------------------

const STAT_STYLES = {
  blue: { card: "bg-primary-tint", circle: "bg-primary" },
  yellow: { card: "bg-yellow-bg", circle: "bg-yellow" },
  green: { card: "bg-green-bg", circle: "bg-green" },
  red: { card: "bg-red-bg", circle: "bg-red" },
} as const;

function StatTiles({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        color="blue"
        icon={<Video className="h-5 w-5 text-white" strokeWidth={2} />}
        value={stats.meetings_this_week}
        label="Meetings"
      />
      <StatTile
        color="yellow"
        icon={<ListChecks className="h-5 w-5 text-white" strokeWidth={2} />}
        value={stats.tasks_this_week}
        label="Tasks"
      />
      <StatTile
        color="green"
        icon={<PencilLine className="h-5 w-5 text-white" strokeWidth={2} />}
        value={stats.drafts_ready}
        label="Drafted"
      />
      <StatTile
        color="red"
        icon={<AlertTriangle className="h-5 w-5 text-white" strokeWidth={2} />}
        value={stats.action_required}
        label="Action Required"
      />
    </div>
  );
}

function StatTile({
  color,
  icon,
  value,
  label,
}: {
  color: keyof typeof STAT_STYLES;
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  const style = STAT_STYLES[color];
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ${style.card}`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.circle}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-ink">{value}</div>
        <div className="text-xs font-medium text-ink-muted">{label}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent meetings — newest three, with a "see all" button to expand
// ---------------------------------------------------------------------------

function RecentMeetings({ sessions }: { sessions: Session[] }) {
  const recent = sessions.slice(0, 3);
  return (
    <section className="lg:col-span-2">
      <div className="flex h-full flex-col rounded-xl border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Recent meetings</h2>
        </div>
        <div className="flex-1 divide-y divide-line">
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">
              No meetings captured yet. Install the extension to start.
            </p>
          ) : (
            recent.map((s) => (
              <Link
                key={s.session_id}
                href={`/meetings/${s.session_id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">
                    {s.title ?? "Untitled meeting"}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {formatDateTime(s.started_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-ink-muted">
                    {s.task_count} {s.task_count === 1 ? "task" : "tasks"}
                  </span>
                  <Badge tone={s.status === "active" ? "info" : "success"}>
                    {s.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-line p-3">
          <Link
            href="/meetings"
            className="block rounded-lg border border-line py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            See all meetings →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tasks status — timeframe-filtered breakdown (drafted / action req / finished)
// ---------------------------------------------------------------------------

function TasksStatus({
  tasks,
  timeframe,
  onTimeframeChange,
}: {
  tasks: Task[];
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}) {
  const counts = useMemo(() => {
    const start =
      timeframe === "today"
        ? todayLocal()
        : timeframe === "week"
          ? startOfWeek(todayLocal())
          : startOfMonth(todayLocal());
    const c = { drafted: 0, awaiting: 0, done: 0 };
    for (const t of tasks) {
      if (new Date(t.created_at) < start) continue;
      const b = bucketFor(t);
      if (b === "drafted") c.drafted++;
      else if (b === "awaiting") c.awaiting++;
      else if (b === "done") c.done++;
    }
    return c;
  }, [tasks, timeframe]);

  const total = counts.drafted + counts.awaiting + counts.done;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  return (
    <section>
      <div className="flex h-full flex-col rounded-xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Tasks Status</h2>
          <TimeframeDropdown value={timeframe} onChange={onTimeframeChange} />
        </div>

        <div className="mt-4">
          <div className="text-4xl font-bold tracking-tight text-ink">
            {total}
          </div>
          <div className="text-xs text-ink-muted">
            Tasks · {TIMEFRAME_LABELS[timeframe]}
          </div>
        </div>

        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface">
          <div className="bg-primary" style={{ width: `${pct(counts.drafted)}%` }} />
          <div className="bg-yellow" style={{ width: `${pct(counts.awaiting)}%` }} />
          <div className="bg-green" style={{ width: `${pct(counts.done)}%` }} />
        </div>

        <div className="mt-4 space-y-3">
          <LegendRow dot="bg-primary" label="Drafted" count={counts.drafted} />
          <LegendRow
            dot="bg-yellow"
            label="Action Required"
            count={counts.awaiting}
          />
          <LegendRow dot="bg-green" label="Finished" count={counts.done} />
        </div>

        <Link
          href="/tasks"
          className="mt-5 block rounded-lg bg-neutral-900 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Open Tasks
        </Link>
      </div>
    </section>
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

function TimeframeDropdown({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (t: Timeframe) => void;
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface"
      >
        {TIMEFRAME_LABELS[value]}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border border-line bg-white py-1 shadow-md">
          {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-surface ${
                value === t ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              <span>{TIMEFRAME_LABELS[t]}</span>
              {value === t ? <span className="text-primary">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks table — every task, styled like dashboard_image's bottom table
// ---------------------------------------------------------------------------

function TasksTable({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  return (
    <section>
      <div className="rounded-xl border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Tasks</h2>
          <Link
            href="/tasks"
            className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
          >
            See all →
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">
            No tasks yet. Capture a meeting to see action items here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-muted">
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
                        router.push(
                          `/meetings/${t.session_id}#task-${t.task_id}`,
                        )
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
// Helpers
// ---------------------------------------------------------------------------

const DOT_BY_CONFIDENCE: Record<Confidence, string> = {
  high: "bg-green",
  moderate: "bg-yellow",
  low: "bg-red",
};

type BadgeTone = "neutral" | "info" | "success" | "warn" | "danger";

function statusBadge(task: Task): { label: string; tone: BadgeTone } {
  const b = bucketFor(task);
  if (b === "drafted") return { label: "Drafted", tone: "success" };
  if (b === "awaiting") return { label: "Action Required", tone: "danger" };
  if (b === "suggested") return { label: "Suggested", tone: "info" };
  if (b === "done") return { label: "Done", tone: "neutral" };
  return { label: "Pending", tone: "neutral" };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
