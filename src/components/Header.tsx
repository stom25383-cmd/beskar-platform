"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import CurrencyToggle from "./CurrencyToggle";

const NAV = [
  { href: "/apps", label: "Applications" },
  { href: "/apps?sort=new", label: "New" },
  { href: "/trust", label: "Trust & Integrity" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[0.06] bg-void/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="BESKAR home" className="flex items-center">
          <BrandMark size={34} withWordmark priority />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="text-sm text-titanium-400 transition-colors hover:text-titanium-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <CurrencyToggle />
          </div>
          <Link
            href="/apps"
            className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex"
          >
            Browse apps
          </Link>
          <button
            type="button"
            className="btn-ghost p-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/[0.06] bg-void/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto max-w-7xl px-5 py-4" aria-label="Mobile">
            <ul className="flex flex-col gap-1">
              {NAV.map((n) => (
                <li key={n.label}>
                  <Link
                    href={n.href}
                    className="block rounded-lg px-3 py-3 text-titanium-200 hover:bg-white/[0.04]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between px-3">
              <span className="text-xs text-titanium-400">Display currency</span>
              <CurrencyToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
