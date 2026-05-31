import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

// Inter — the modern SaaS workhorse. Loaded via next/font so it's
// server-rendered + no CLS. Exposed as the CSS var `--font-inter`; the
// `@theme --font-sans` in globals.css consumes it as the primary family.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MeetPilot",
  description:
    "Turn your meetings into ready-to-send action items. The AI proposes; you dispose.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
