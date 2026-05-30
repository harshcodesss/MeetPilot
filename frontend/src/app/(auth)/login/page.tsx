import { Card } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/api";

/**
 * Phase 1 placeholder. Phase 2 wires the button to a real Google sign-in.
 * Single CTA — the brief locks "Google sign-in ONLY"; no email/password,
 * no register, no forgot-password.
 *
 * The href points at the backend's OAuth start endpoint — a full top-level
 * navigation, not a Next router push, because OAuth's redirect chain has to
 * leave our origin.
 */
export default function LoginPage() {
  return (
    <Card className="text-center">
      <h1 className="text-2xl font-semibold text-surface-900">
        Sign in to MeetPilot
      </h1>
      <p className="mt-2 text-sm text-surface-500">
        Google sign-in is the only way in.
      </p>

      <a
        href={`${API_BASE_URL}/auth/google/login`}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-base font-medium text-white shadow-soft hover:bg-brand-600 transition-colors"
      >
        Continue with Google
      </a>
    </Card>
  );
}
