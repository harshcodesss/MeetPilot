import type { ReactNode } from "react";

/**
 * Centered minimal shell for `/login` and `/auth/callback` — no sidebar,
 * no top nav. A soft branded gradient backdrop; the login page carries its
 * own branding inside the card.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-tint via-white to-surface px-6 py-12">
      {children}
    </div>
  );
}
