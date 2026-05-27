"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/daily", label: "Daily Results" },
  { href: "/pairings", label: "Pairings" },
  { href: "/skins", label: "Skins" },
  { href: "/bonus", label: "Bonus" },
  { href: "/payouts", label: "Payouts" },
  { href: "/cards", label: "Cards" },
  { href: "/info", label: "Info" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-gold/20 bg-brand-dark/85 backdrop-blur-md">
      <div className="container-narrow flex items-center justify-between py-3">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname?.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "px-3 py-2 rounded-md text-sm font-semibold uppercase tracking-wider transition " +
                  (active
                    ? "text-brand-dark bg-brand-gold"
                    : "text-brand-cream/85 hover:text-brand-gold hover:bg-brand-gold/10")
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <button
          aria-label="Toggle menu"
          className="md:hidden text-brand-cream rounded-md border border-brand-gold/30 p-2 hover:bg-brand-gold/10"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-brand-gold/20 bg-brand-dark/95">
          <div className="container-narrow flex flex-col py-2">
            {links.map((l) => {
              const active =
                pathname === l.href ||
                (l.href !== "/" && pathname?.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={
                    "px-3 py-3 rounded-md text-sm font-semibold uppercase tracking-wider transition " +
                    (active
                      ? "text-brand-dark bg-brand-gold"
                      : "text-brand-cream hover:bg-brand-gold/10")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
