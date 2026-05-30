interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const dim = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block ${dim} animate-spin rounded-full border-2 border-line border-t-primary ${className}`}
    />
  );
}
