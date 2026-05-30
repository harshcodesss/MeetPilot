import { AnswerForm } from "@/components/app/AnswerForm";
import { ConfidenceBadge } from "@/components/app/ConfidenceBadge";
import { DraftView } from "@/components/app/DraftView";
import { MeetingCard } from "@/components/app/MeetingCard";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/Card";
import {
  mockHandlerTasks,
  mockSessions,
  mockTaskAwaiting,
} from "@/lib/dev-mocks";

import { TaskCardDev } from "./TaskCardDev";

/**
 * Phase 3 dev-only mount, lives at `/dev/taskcard`. Renders every Phase 3
 * component permutation side-by-side against mock data so we iterate the
 * visual + behaviour without standing up Meeting Detail or Tasks first.
 *
 * Folder is `dev/` (not `_dev/`) because Next treats underscore-prefixed
 * folders as private and refuses to route them. Convention + Phase 10 Step E
 * deletion keep it out of the production surface.
 *
 * Grows through 3.0 → 3.4: ConfidenceBadge / MeetingCard / StatCard now;
 * DraftView (8 handler shapes) lands in 3.1; AnswerForm in 3.2; TaskCard
 * (4 body shapes + done + suggested) in 3.3. Deleted in Phase 10 Step E.
 *
 * Auth-gated via the (app) layout — log in first or you'll bounce to /login.
 */
export default function TaskCardDevPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          /dev/taskcard
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Dev-only mount. Mock data; no backend reads. Removed in Phase 10.
        </p>
      </header>

      <Section title="ConfidenceBadge">
        <div className="flex flex-wrap items-center gap-3">
          <ConfidenceBadge confidence="high" />
          <ConfidenceBadge confidence="moderate" />
          <ConfidenceBadge confidence="low" />
        </div>
      </Section>

      <Section title="StatCard">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Meetings" value={3} hint="last 7 days" />
          <StatCard label="Tasks" value={7} hint="last 7 days" />
          <StatCard label="Drafts Ready" value={3} />
          <StatCard label="Action Required" value={2} prominent />
        </div>
      </Section>

      <Section title="MeetingCard">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockSessions.map((s) => (
            <MeetingCard key={s.session_id} session={s} />
          ))}
        </div>
      </Section>

      <Section title="DraftView">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {mockHandlerTasks.map((t) => (
            <DraftView key={t.task_id} task={t} />
          ))}
        </div>
      </Section>

      <Section title="AnswerForm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <p className="mb-4 text-xs text-ink-faint">
              Mock-mode. Fill (or not), Submit, watch the spinner appear.
              Stays on the polling state — Phase 4 wires real submission.
            </p>
            <AnswerForm task={mockTaskAwaiting} mockMode />
          </Card>
        </div>
      </Section>

      <Section title="TaskCard">
        <TaskCardDev />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
