"use client";

import Link from "next/link";
import { useT } from "@/components/providers";

/** 404: the landing and the app have different shells, so this page carries its own way back. */
export default function NotFound() {
  const t = useT();
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center"
    >
      <p className="font-mono text-sm text-ink-3">404</p>
      <h1 className="font-display text-3xl font-extrabold text-ink">{t.notFound.title}</h1>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4 font-medium text-ink"
        >
          {t.nav.home}
        </Link>
        <Link
          href="/hoi-dap"
          className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 font-medium text-white"
        >
          {t.nav.ask}
        </Link>
      </div>
    </main>
  );
}
