import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";

import "./globals.css";

// Geist — the app's primary sans, exposed as `--font-sans` (consumed by the
// `font-sans` utility + the body font-family). Inter stays available as
// `--font-inter` for any explicit opt-ins.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
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
    <html
      lang="en"
      className={`h-full font-sans antialiased ${geist.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
