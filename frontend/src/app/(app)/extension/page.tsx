import { ExtensionConnect } from "@/components/app/ExtensionConnect";
import { FlipBoardHero } from "@/components/app/FlipBoardHero";

/**
 * Extension — the permanent home for the capture-extension download + connect
 * flow (linked from the sidebar). The dashboard surfaces a self-dismissing
 * onboarding version for first-run; this page is always available for
 * reinstalls / new devices.
 */
const BOARD_MESSAGES = [
  "MEETPILOT \nON THE JOB \n{B}{G}{Y}{R}",
  "CONNECT THE \nEXTENSION \nLET'S FLY",
  "EVERY MEETING \nEVERY TASK \nCAPTURED",
  "NEVER GHOST \nAN ACTION \nITEM AGAIN",
];

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FlipBoardHero messages={BOARD_MESSAGES} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Browser extension
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Install the Chrome extension and connect it to your account — your
          next Google Meet captures itself.
        </p>
      </div>

      <ExtensionConnect showHeading={false} />
    </div>
  );
}
