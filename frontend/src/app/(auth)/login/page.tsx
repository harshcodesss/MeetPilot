import { Card } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/api";

/**
 * The single sign-in surface — Google-only per the locked brief. No
 * email/password, no register, no forgot-password. The CTA is a full
 * top-level navigation to the backend's OAuth start endpoint; OAuth's
 * redirect chain has to leave the SPA's origin to reach accounts.google.com.
 */
export default function LoginPage() {
  return (
    <Card className="text-center">
      <h1 className="text-2xl font-semibold text-ink">Sign in to MeetPilot</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Google sign-in is the only way in.
      </p>

      <a
        href={`${API_BASE_URL}/auth/google/login`}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-medium text-white shadow-soft hover:bg-primary-hover transition-colors"
      >
        Continue with Google
      </a>
    </Card>
  );
}
