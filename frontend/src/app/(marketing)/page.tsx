import { Card } from "@/components/ui/Card";

/**
 * Phase 1 placeholder. Phase 11 replaces this with the real landing — hero,
 * what-it-does, how-it-works, features grid, animated scroll reveal.
 */
export default function MarketingHome() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-ink">
        Landing — <span className="text-primary">polished last.</span>
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        Turn your meetings into ready-to-send action items. The AI proposes;
        you dispose.
      </p>

      <Card className="mt-12 text-left">
        <h2 className="text-base font-medium text-ink">
          What ships in Phase 11
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
          <li>Hero with logo + tagline</li>
          <li>What-it-does three-card row</li>
          <li>How-it-works steps</li>
          <li>Features grid + screenshots</li>
        </ul>
      </Card>
    </section>
  );
}
