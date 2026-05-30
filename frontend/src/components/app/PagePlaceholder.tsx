import { Card } from "@/components/ui/Card";

interface PagePlaceholderProps {
  name: string;
  arrivesIn: string;
}

/**
 * Phase 1 utility — every `(app)` page starts here so the scaffold is
 * navigable end-to-end without standing up real data fetches. Each page
 * passes the name shown in the header + the phase that fills it in. The
 * real page replaces the import + JSX at its own phase.
 */
export function PagePlaceholder({ name, arrivesIn }: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{name}</h1>
      <Card className="mt-6">
        <p className="text-ink-muted">
          <span className="font-medium text-ink">Coming soon.</span>{" "}
          Implemented in {arrivesIn}.
        </p>
      </Card>
    </div>
  );
}
