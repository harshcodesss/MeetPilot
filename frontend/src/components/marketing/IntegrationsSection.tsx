import { FadeIn } from "@/components/marketing/FadeIn";
import { Marquee } from "@/components/ui/marquee";

/**
 * Integrations band — a single scrolling row of the tools MeetPilot drafts
 * into. Logos stay in full brand color, so the band sits on a light surface
 * (dark logos like Notion would vanish on black). Pauses on hover.
 *
 * The eight reflect the product's surfaces: Google Meet (capture) plus the
 * action handlers — Gmail, Google Calendar, Slack, Jira, Asana, Notion, and a
 * personal task tool (Todoist standing in for the `todo` handler).
 */
// `wordmark: true` = the SVG already contains the brand name, so we skip the
// text label to avoid showing it twice (e.g. Slack, Todoist).
const INTEGRATIONS = [
  { name: "Gmail", src: "/logos/gmail.svg" },
  { name: "Google Calendar", src: "/logos/google-calendar.svg" },
  { name: "Slack", src: "/logos/slack.svg", wordmark: true },
  { name: "Jira", src: "/logos/jira.svg" },
  { name: "Notion", src: "/logos/notion.svg" },
  { name: "Asana", src: "/logos/asana.svg" },
  { name: "Google Meet", src: "/logos/google-meet.svg" },
  { name: "Todoist", src: "/logos/todoist.svg", wordmark: true },
];

export function IntegrationsSection() {
  return (
    <section
      id="integrations"
      className="border-y border-line bg-surface px-6 py-20"
    >
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Works with the tools you already use.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-ink-muted">
            Every task from your meeting is drafted straight into the apps your
            team already works in.
          </p>
        </FadeIn>

        <div className="relative mt-12 overflow-hidden">
          <Marquee pauseOnHover className="[--duration:32s]">
            {INTEGRATIONS.map((tool) => (
              <div key={tool.name} className="mx-6 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tool.src} alt={tool.name} className="h-9 w-auto" />
                {!tool.wordmark && (
                  <span className="whitespace-nowrap text-base font-medium text-ink-muted">
                    {tool.name}
                  </span>
                )}
              </div>
            ))}
          </Marquee>

          {/* Edge fades so logos slide in/out instead of hard-clipping. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent" />
        </div>
      </div>
    </section>
  );
}
