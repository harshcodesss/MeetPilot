import {
  ChevronDown,
  Plug,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Help — static FAQ. Server component; no fetches, no client state. Native
 * <details> for collapsible entries (accessible by default, no JS needed);
 * the default disclosure arrow is hidden in favour of a circular chevron that
 * rotates on open, with a topical icon circle leading each question.
 */

interface Faq {
  q: string;
  icon: LucideIcon;
  a: React.ReactNode;
}

const FAQS: Faq[] = [
  {
    q: "What is MeetPilot?",
    icon: Sparkles,
    a: (
      <>
        A Chrome extension + dashboard that watches your Google Meet calls,
        pulls out the action items (who owes what, by when), and drafts the
        follow-up work (emails, calendar events, tickets) for you to review
        before sending. The AI proposes; you dispose.
      </>
    ),
  },
  {
    q: "How do I install the extension?",
    icon: Wrench,
    a: (
      <>
        Go to the Extension page, click <strong>Download (.zip)</strong>, unzip
        the file, open{" "}
        <code className="rounded bg-surface px-1 text-xs">
          chrome://extensions
        </code>
        , toggle <strong>Developer mode</strong> on, and click{" "}
        <strong>Load unpacked</strong> with the unzipped folder. Then pair the
        extension with the code shown on that page.
      </>
    ),
  },
  {
    q: "Does MeetPilot actually send emails or create calendar events?",
    icon: Send,
    a: (
      <>
        Not in this version. Every drafted action (Gmail, Calendar, Jira,
        Slack, Notion, Asana, To-dos) is <strong>displayed only</strong>. You
        review the draft and copy it where you want it to go. Live sending is
        on the roadmap; this version is read-only by design.
      </>
    ),
  },
  {
    q: "What happens if I dismiss a suggested task?",
    icon: Trash2,
    a: (
      <>
        It’s removed from every view (Tasks board, Meeting Detail, Calendar).
        Dismissed tasks aren’t deleted from the database; they’re just filtered
        out of the UI. They can’t be undone from the app today, so only dismiss
        tasks you’re sure aren’t real commitments.
      </>
    ),
  },
  {
    q: "Where does my data go?",
    icon: ShieldCheck,
    a: (
      <>
        Captions are read from the Google Meet page directly (the extension
        scrapes the on-screen caption DOM, with no audio recording and no
        speech models). They’re posted to a backend you control. The drafting
        LLM sees only the transcript text for that meeting. Your Google account
        is used for identity only (we don’t access Gmail or Calendar in this
        version).
      </>
    ),
  },
  {
    q: "Why is the pairing not connecting?",
    icon: Plug,
    a: (
      <>
        The most common cause is that the extension isn’t installed yet, or is
        loaded from a different folder than expected. As a workaround, copy the
        pairing code from the Extension page and paste it into the extension
        popup’s token input.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Help</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Answers to the most common questions about how MeetPilot works.
        </p>
      </header>

      <div className="space-y-3">
        {FAQS.map((faq, i) => {
          const Icon = faq.icon;
          return (
            <details
              key={i}
              className="group rounded-xl border border-line bg-white shadow-soft transition-colors hover:border-ink-faint/40 open:border-primary/30"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="flex-1 text-sm font-medium text-ink">
                  {faq.q}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted transition-colors group-open:bg-primary group-open:text-white">
                  <ChevronDown
                    className="h-4 w-4 transition-transform duration-300 group-open:rotate-180"
                    strokeWidth={2}
                  />
                </span>
              </summary>
              <div className="pr-4 pb-4 pl-16 text-sm leading-relaxed text-ink-muted">
                {faq.a}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
