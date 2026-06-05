"use client";

import Link from "next/link";

import { useAuthToken } from "@/lib/auth-hook";

/**
 * "Get Started" CTA that's auth-aware: if the visitor already holds a bearer
 * token (i.e. they're signed in), it routes straight to the dashboard;
 * otherwise it sends them to the Google sign-in. Renders `null`-safe during
 * SSR (token resolves to null on the server, so the default is /login).
 */
export function GetStartedLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const token = useAuthToken();
  const href = token ? "/dashboard" : "/login";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
