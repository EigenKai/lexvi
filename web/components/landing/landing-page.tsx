"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers";
import { LangToggle } from "@/components/shell/lang-toggle";
import { ease } from "@/lib/motion";
import { KineticLine, Mark, MetaPill, TryButton, TryLiveLink, WatchButton } from "./bits";
import { FeatureTour } from "./feature-tour";
import { Proof } from "./proof";
import { Saved } from "./saved";
import { Story } from "./story";
import { TimeGraph } from "./time-graph";
import { VideoModal } from "./video-modal";

/**
 * The landing page: Mr. Minh's morning told as one scroll — the same story and grammar as the demo
 * film (story first, real UI full-bleed, notes in footer lines, numbers as real items counting up).
 * Two calls to action everywhere: "Watch the demo" (the film) and "Try the demo" (the app).
 */
export function LandingPage() {
  const [video, setVideo] = useState(false);
  const { t } = useLocale();
  useEffect(() => {
    document.title = t.landing.docTitle;
  }, [t]);
  // The Ask screen used to live at "/": send old film or question links on to it.
  useEffect(() => {
    const q = window.location.search;
    if (/[?&](film|q|autoplay|scenario|date|today|pace)=/.test(q))
      window.location.replace(`/hoi-dap${q}`);
  }, []);
  const watch = () => setVideo(true);
  return (
    <>
      <Header />
      <main id="landing-main" tabIndex={-1} className="overflow-x-clip outline-none">
        <Story onWatch={watch} />
        <TimeGraph />
        <FeatureTour />
        <Proof />
        <Saved />
        <Final onWatch={watch} />
      </main>
      <VideoModal open={video} onOpenChange={setVideo} />
    </>
  );
}

function Header() {
  const { t } = useLocale();
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 40));
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-4 px-5 transition-[background-color,border-color] duration-300 ${
        solid ? "border-b border-line bg-paper/90 backdrop-blur" : "border-b border-transparent"
      }`}
    >
      <a
        href="#landing-main"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t.skipToContent}
      </a>
      <Link
        href="/"
        aria-label={`${t.brand} — ${t.nav.home}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md"
      >
        <Mark className="size-8" />
        <span className="font-display text-xl font-bold text-ink">{t.brand}</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <LangToggle film="landing-lang" />
        <TryButton compact className="max-sm:hidden" film="landing-try-header" />
      </div>
    </header>
  );
}

function Final({ onWatch }: { onWatch: () => void }) {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <footer className="bg-paper">
      <motion.div
        className="flex flex-col items-center px-6 pt-24 pb-16 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: ease.settle }}
      >
        <Mark className="size-20" />
        <h2 className="mt-6 font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
          <KineticLine text={L.finalTitle} />
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <WatchButton onClick={onWatch} film="landing-watch-final" />
          <TryButton film="landing-try-final" />
          <TryLiveLink film="landing-try-live-final" />
        </div>
        <MetaPill text={L.builtOnFull} className="mt-8" />
        <p className="mt-8 font-sans text-base text-ink-2">{L.roles}</p>
        <a
          href="https://github.com/EigenKai/lexvi"
          className="mt-1 inline-flex min-h-11 items-center font-mono text-sm text-ink underline-offset-4 hover:underline"
          rel="noreferrer"
          target="_blank"
        >
          github.com/EigenKai/lexvi
        </a>
        <p className="mt-6 max-w-3xl font-sans text-sm leading-[1.6] text-ink-3">{L.honesty}</p>
        <p className="mt-2 font-sans text-xs text-ink-3">{L.made}</p>
      </motion.div>
      <p className="border-t border-line bg-surface-sunk px-4 py-3 text-center font-sans text-[0.8125rem] leading-[1.5] text-ink-2">
        {t.disclaimer.full}
      </p>
    </footer>
  );
}
