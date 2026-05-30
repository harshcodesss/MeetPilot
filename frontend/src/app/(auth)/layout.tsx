import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Centered minimal shell for `/login` and `/auth/callback` — no sidebar,
 * no top nav. Single column, branded just enough to feel like the same app.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12">
      <Link href="/" className="mb-8 text-xl font-semibold text-primary">
        MeetPilot
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
