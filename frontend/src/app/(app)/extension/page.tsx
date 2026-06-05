import { FlipBoardHero } from "@/components/app/FlipBoardHero";
import { InstallSteps } from "@/components/app/InstallSteps";

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
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Hero stays in a centered narrow column. */}
      <div className="mx-auto max-w-xl">
        <FlipBoardHero messages={BOARD_MESSAGES} />
      </div>

      {/* Title + the install/connect flow, grouped together. */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Browser extension
        </h1>
        <div className="mt-3">
          <InstallSteps />
        </div>
      </div>
    </div>
  );
}
