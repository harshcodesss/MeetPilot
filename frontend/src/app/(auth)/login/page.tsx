import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { LoginCarousel } from "@/components/auth/LoginCarousel";

/**
 * The single sign-in surface — Google-only per the locked brief. No
 * email/password, no register. Split layout: a white sign-in panel on the
 * left, a three-slide product carousel (Capture → Extraction → Automation) on
 * the right. The CTA is a full top-level navigation to the backend's OAuth
 * start endpoint (OAuth's redirect chain has to leave the SPA's origin to
 * reach accounts.google.com).
 */
export default function LoginPage() {
  return (
    <div className="fixed inset-0 grid grid-cols-1 bg-white lg:grid-cols-[1fr_minmax(0,480px)]">
      {/* Left — product carousel (desktop only) */}
      <div className="hidden p-3 lg:block">
        <div className="h-full w-full overflow-hidden rounded-3xl">
          <LoginCarousel />
        </div>
      </div>

      {/* Right — sign-in panel */}
      <div className="flex h-full flex-col overflow-y-auto px-8 py-10 sm:px-14">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_6px_16px_-4px_rgba(26,115,232,0.6)]">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            MeetPilot
          </span>
        </div>

        {/* Centered sign-in block */}
        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-ink">
            👋 Welcome to MeetPilot
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            Sign in to turn your meetings into action items — captured,
            extracted, and drafted for you automatically.
          </p>

          {/* Container for the Continue with Google button */}
          <div className="mt-9 max-w-sm rounded-2xl border border-line bg-surface p-5">
            <a
              href={`${API_BASE_URL}/auth/google/login`}
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-6 py-3 text-[15px] font-medium text-ink shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
            >
              <GoogleMark />
              Continue with Google
            </a>
            <p className="mt-3 text-center text-xs text-ink-faint">
              We only use Google to sign you in — nothing is posted on your behalf.
            </p>
          </div>

          <p className="mt-9 max-w-sm text-xs leading-relaxed text-ink-faint">
            By continuing you agree to our{" "}
            <span className="text-ink-muted underline-offset-2 hover:underline">
              Terms of Use
            </span>{" "}
            and{" "}
            <span className="text-ink-muted underline-offset-2 hover:underline">
              Privacy Policy
            </span>
            .
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex max-w-sm items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
          </Link>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
