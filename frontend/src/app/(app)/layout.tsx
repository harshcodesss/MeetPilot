import type { ReactNode } from "react";

import { AuthGuard } from "@/components/app/AuthGuard";
import { Sidebar } from "@/components/app/Sidebar";

/**
 * Private app shell — sidebar + main content area, gated by client-side
 * auth guard. Every page under `(app)` runs through here.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
