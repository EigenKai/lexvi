"use client";

import { cn } from "cn";
import { Bell, FlaskConical, type LucideIcon, MessageSquareText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useT } from "@/components/providers";
import { DisclaimerBar } from "./disclaimer-bar";
import { LangToggle } from "./lang-toggle";

const NAV: { href: string; key: "ask" | "alerts" | "profile" | "benchmark"; icon: LucideIcon }[] = [
  { href: "/", key: "ask", icon: MessageSquareText },
  { href: "/canh-bao", key: "alerts", icon: Bell },
  { href: "/ho-so", key: "profile", icon: UserRound },
  { href: "/kiem-thu", key: "benchmark", icon: FlaskConical },
];

function Logo({ className }: { className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* Brand mark: an open statute page with a jade check — no emblems, nothing official-looking. */}
      <svg viewBox="0 0 28 28" aria-hidden className="size-7">
        <rect x="1" y="1" width="26" height="26" rx="7" className="fill-brand" />
        <path
          d="M8 8.5h8M8 12.5h12M8 16.5h6"
          stroke="#FAF8F3"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M15.5 19.2l2.3 2.3 4.4-4.6"
          stroke="#3DD6A3"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="font-display text-lg font-semibold tracking-normal text-ink">{t.brand}</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  // Height of the sticky footer (disclaimer + bottom nav), so sticky content can sit above it.
  const footer = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = footer.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => {
      root.style.setProperty("--app-footer-h", `${el.offsetHeight}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--app-footer-h");
    };
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        data-film="skip-link"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t.skipToContent}
      </a>
      {/* Left rail ≥1024 */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md px-2"
          aria-label={`${t.brand} — ${t.nav.ask}`}
        >
          <Logo />
        </Link>
        <p className="mt-2 px-2 text-sm text-ink-3">{t.tagline}</p>
        <nav aria-label={t.nav.label} className="mt-8">
          <ul className="flex flex-col gap-1">
            {NAV.map(({ href, key, icon: Icon }) => {
              const label = t.nav[key];
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    data-film={`nav-${href === "/" ? "ask" : href.slice(1)}`}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-medium transition-colors",
                      active
                        ? "bg-brand-tint text-brand"
                        : "text-ink-2 hover:bg-surface-sunk hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto px-2">
          <LangToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar <1024 */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md"
            aria-label={`${t.brand} — ${t.nav.ask}`}
          >
            <Logo />
          </Link>
          <div className="ml-auto">
            <LangToggle film="lang-toggle-mobile" />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>

        <footer ref={footer} className="sticky bottom-0 z-30">
          <DisclaimerBar />
          {/* Bottom nav <1024 */}
          <nav aria-label={t.nav.label} className="border-t border-line bg-paper lg:hidden">
            <ul className="grid grid-cols-4">
              {NAV.map(({ href, key, icon: Icon }) => {
                const label = t.nav[key];
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-film={`nav-mobile-${href === "/" ? "ask" : href.slice(1)}`}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                        active ? "text-brand" : "text-ink-3",
                      )}
                    >
                      <Icon aria-hidden className="size-5" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  );
}
