"use client";

import { useState } from "react";

import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavbarButton,
  NavbarLogo,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar";

/**
 * The marketing site's top navigation — a resizable, scroll-aware pill that
 * shrinks and gains a blurred backdrop once you scroll past the hero. Built on
 * the Aceternity navbar primitives in `ui/resizable-navbar.tsx`; this file is
 * the MeetPilot-specific composition (brand, links, CTA).
 *
 * Links target the on-page section anchors that the landing renders top-down:
 * Demo → Features → How it works. The CTA routes to the single Google sign-in.
 */
const NAV_LINKS = [
  { name: "Integrations", link: "#integrations" },
  { name: "How it works", link: "#how-it-works" },
  { name: "Features", link: "#features" },
  { name: "About", link: "#about" },
];

export function SiteNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Navbar className="top-4">
      {/* Desktop */}
      <NavBody>
        <NavbarLogo />
        <NavItems items={NAV_LINKS} />
        <div className="relative z-20 flex items-center gap-2">
          <NavbarButton href="/login" variant="dark">
            Get Started
          </NavbarButton>
        </div>
      </NavBody>

      {/* Mobile */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle
            isOpen={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          />
        </MobileNavHeader>

        <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          {NAV_LINKS.map((item) => (
            <a
              key={item.link}
              href={item.link}
              onClick={(e) => {
                if (item.link.startsWith("#")) {
                  e.preventDefault();
                  document
                    .querySelector(item.link)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                setMobileOpen(false);
              }}
              className="w-full px-2 py-1 text-base font-medium text-ink-muted hover:text-ink"
            >
              {item.name}
            </a>
          ))}
          <NavbarButton
            href="/login"
            variant="dark"
            className="mt-2 w-full"
            onClick={() => setMobileOpen(false)}
          >
            Get Started
          </NavbarButton>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
