import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number;
  /** Helper text shown small + muted under the value (e.g. "last 7 days"). */
  hint?: string;
  /**
   * Subtle "attention" emphasis for the Dashboard's Action Required stat.
   *
   * Color choice: yellow accent (left border + bolder yellow text on value)
   * per the brief — Action Required is an attention signal, so the semantic
   * yellow matches. Primary blue would be a category misuse here because
   * blue is the brand/decorative color, not an attention signal.
   */
  prominent?: boolean;
}

export function StatCard({ label, value, hint, prominent = false }: StatCardProps) {
  return (
    <Card
      className={prominent ? "border-l-4 border-l-yellow" : undefined}
    >
      <div className="text-sm font-medium text-ink-muted">{label}</div>
      <div
        className={`mt-2 text-4xl tracking-tight ${
          prominent ? "font-bold text-yellow-text" : "font-semibold text-ink"
        }`}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-ink-faint">{hint}</div> : null}
    </Card>
  );
}
