import { Card } from "@/components/ui/Card";

/**
 * Help — static FAQ. Brief locks it as "trivial placeholder content."
 * Server component; no fetches, no client state. Native <details> for
 * collapsible FAQ entries (accessible by default, no JS needed).
 */

interface Faq {
  q: string;
  a: React.ReactNode;
}

const FAQS: Faq[] = [
  {
    q: "What is MeetPilot?",
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
    a: (
      <>
        Go to the Dashboard, click <strong>Download (.zip)</strong> in the
        “Get the extension” card, unzip the file, open{" "}
        <code className="rounded bg-surface px-1 text-xs">
          chrome://extensions
        </code>
        , toggle <strong>Developer mode</strong> on, and click{" "}
        <strong>Load unpacked</strong> with the unzipped folder. Then come
        back here and hit <strong>Connect to my account</strong>.
      </>
    ),
  },
  {
    q: "Does MeetPilot actually send emails or create calendar events?",
    a: (
      <>
        Not in this version. Every drafted action — Gmail, Calendar, Jira,
        Slack, Notion, Asana, To-dos — is <strong>displayed only</strong>.
        You review the draft and copy it where you want it to go. Live
        sending is on the roadmap; this version is read-only by design.
      </>
    ),
  },
  {
    q: "What happens if I dismiss a suggested task?",
    a: (
      <>
        It’s removed from every view — Tasks board, Meeting Detail, Calendar.
        Dismissed tasks aren’t deleted from the database; they’re just
        filtered out of the UI. They can’t be undone from the app today, so
        only dismiss tasks you’re sure aren’t real commitments.
      </>
    ),
  },
  {
    q: "Where does my data go?",
    a: (
      <>
        Captions are read from the Google Meet page directly (the extension
        scrapes the on-screen caption DOM — no audio recording, no speech
        models). They’re posted to a backend you control. The drafting LLM
        sees only the transcript text for that meeting. Your Google account
        is used for identity only (we don’t access Gmail or Calendar in this
        version).
      </>
    ),
  },
  {
    q: "Why is the “Connect to my account” button failing?",
    a: (
      <>
        The most common cause is that the extension isn’t installed yet, or
        is loaded from a different folder than expected. As a workaround,
        click <strong>Having trouble? Show pairing code</strong> on the
        Dashboard’s extension card, copy the code, and paste it into the
        extension popup’s token input.
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Help</h1>
      <Card>
        <div className="divide-y divide-line">
          {FAQS.map((faq, i) => (
            <details key={i} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer text-sm font-medium text-ink hover:text-primary transition-colors">
                {faq.q}
              </summary>
              <div className="mt-2 text-sm text-ink-muted">{faq.a}</div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
