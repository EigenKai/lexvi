"use client";

import { Pause, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { FooterNote } from "./bits";

/**
 * MotionLoop (DESIGN.md §10.4): a pre-rendered, seamless HyperFrames loop played as a muted video.
 * Pauses off-screen; under reduced motion only the poster is shown.
 * Source: film/lexvi-landing-loop (8 s, rendered with `npx hyperframes render`).
 */
function MotionLoop({ src, poster, label }: { src: string; poster: string; label: string }) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  // DESIGN.md §8: phones get the poster only.
  const small = useMediaQuery("(max-width: 639px)");
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced || small) return;
    if (paused) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced, small, paused]);
  if (reduced || small) {
    // biome-ignore lint/performance/noImgElement: a fixed poster frame of the loop
    return <img src={poster} alt={label} className="block w-full" />;
  }
  return (
    <div className="relative">
      <video
        ref={ref}
        className="block w-full"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? t.landing.playLoop : t.landing.pauseLoop}
        className="absolute right-3 bottom-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line bg-paper/95 text-ink shadow-overlay focus-visible:outline-2 focus-visible:outline-brand"
      >
        {paused ? (
          <Play aria-hidden className="size-4" />
        ) : (
          <Pause aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}

/** The time-aware idea in one picture: the date you ask moves along the real amendment chain. */
export function TimeGraph() {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <section aria-labelledby="graph-title" className="bg-paper">
      <motion.div
        className="mx-auto max-w-[1400px] px-4 pt-20 pb-6 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: ease.settle }}
      >
        <h2
          id="graph-title"
          className="mx-auto max-w-4xl font-display text-[clamp(1.8rem,3.6vw,3.25rem)] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink"
        >
          {L.graphTitle}
        </h2>
        <div className="mt-6">
          <MotionLoop
            src="/landing/graph-loop.mp4"
            poster="/landing/graph-loop.jpg"
            label={L.graphAlt}
          />
        </div>
      </motion.div>
      <FooterNote>{L.graphNote}</FooterNote>
    </section>
  );
}
