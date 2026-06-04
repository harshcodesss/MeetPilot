import type { ReactNode } from "react";

import { AuthGuard } from "@/components/app/AuthGuard";
import { AppDock } from "@/components/app/AppDock";

/**
 * Private app shell — floating vertical dock + main content area, gated by
 * client-side auth guard. Every page under `(app)` runs through here. The dock
 * floats fixed on the left, so the main pane gets left padding to clear it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden bg-white">
        <AppDock />
        {/* pl clears the dock plus its magnified, popped-out icon on hover
            (dock sits at left-4, ~64px wide, icons peak ~80px) so content is
            never overlapped. */}
        <main className="h-screen overflow-y-auto py-8 pr-8 pl-32">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
