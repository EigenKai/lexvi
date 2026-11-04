"use client";

import { Pause, Play } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { Caption, FooterNote } from "./bits";

/**
 * How LexVi works, shown on the real app (recorded from the mock build: prepared example responses,
 * labelled in the footer). One full-bleed stage; each step swipes in its clip and the camera
 * punches in on the part that matters — the film's grammar, no laptop frame.
 * Focus points are in the 1440×900 capture's CSS pixels; `t` switches focus mid-clip.
 */
const STEPS = [
  { src: "/landing/f1-date", focus: [{ t: 0, cx: 760, cy: 330, z: 1.45 }] },
  { src: "/landing/f2-checks", focus: [{ t: 0, cx: 840, cy: 600, z: 1.5 }] },
  { src: "/landing/f3-article", focus: [{ t: 0, cx: 1200, cy: 450, z: 1.45 }] },
  {
    src: "/landing/f4-guard",
    focus: [
      { t: 0, cx: 840, cy: 540, z: 1.45 },
      { t: 8.2, cx: 840, cy: 300, z: 1.45 },
    ],
  },
  { src: "/landing/f5-photo", focus: [{ t: 0, cx: 840, cy: 430, z: 1.45 }] },
] as const;
const CAP = { w: 1440, h: 900 };
/** The leaving clip reads the current direction from AnimatePresence's `custom`. */
const SWIPE = {
  enter: (d: number) => ({ x: `${d * 100}%` }),
  center: { x: 0 },
  exit: (d: number) => ({ x: `${-d * 100}%` }),
};

function cam(cx: number, cy: number, z: number, vw: number, vh: number) {
  const s = Math.max(vw / CAP.w, vh / CAP.h) * z;
  const x = Math.min(0, Math.max(vw - s * CAP.w, vw / 2 - s * cx));
  const y = Math.min(0, Math.max(vh - s * CAP.h, vh * 0.46 - s * cy));
  return { scale: s, x, y };
}

export function FeatureTour() {
  const reduced = useReducedMotion();
  const roomy = useMediaQuery("(min-width: 1024px) and (min-height: 600px)");
  return reduced || !roomy ? <FeatureList /> : <FeatureStage />;
}

function FeatureStage() {
  const { t } = useLocale();
  const L = t.landing;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const near = useInView(ref, { margin: "100% 0px 100% 0px" });
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)));
    if (next !== step) {
      setDir(next > step ? 1 : -1);
      setStep(next);
    }
  });
  const info = L.tour[step];
  return (
    <section
      ref={ref}
      aria-label={L.tour.map((s) => s.label).join(" · ")}
      style={{ height: `${STEPS.length * 110}vh` }}
    >
      <div className="sticky top-0 h-dvh overflow-hidden bg-surface">
        <AnimatePresence initial={false} custom={dir}>
          {near && (
            <Clip
              key={step}
              index={step}
              dir={dir}
              vw={vp.w}
              vh={vp.h}
              paused={paused}
              label={info.label}
            />
          )}
        </AnimatePresence>

        {/* chapter label, docked under the header's logo */}
        <div className="absolute top-[76px] left-5 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3, ease: ease.settle }}
              className="inline-flex items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-2.5 shadow-overlay"
            >
              <span className="font-mono text-xs text-ink-3">{`0${step + 1} / 0${STEPS.length}`}</span>
              <span className="font-sans text-lg font-bold text-ink">{info.label}</span>
              {info.meta && (
                <span className="font-sans text-sm font-semibold text-brand">· {info.meta}</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute inset-x-0 bottom-12 z-10 px-4">
          <AnimatePresence mode="wait">
            <Caption key={info.caption} text={info.caption} />
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="absolute right-5 bottom-14 z-20 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-line bg-paper/95 px-3 font-sans text-sm font-semibold text-ink shadow-overlay focus-visible:outline-2 focus-visible:outline-brand"
        >
          {paused ? (
            <Play aria-hidden className="size-4" />
          ) : (
            <Pause aria-hidden className="size-4" />
          )}
          {paused ? L.play : L.pause}
        </button>
        <div className="absolute inset-x-0 bottom-0 z-10">
          <FooterNote>{L.tourNote}</FooterNote>
        </div>
      </div>
    </section>
  );
}

/** One step's clip: swipes in from the side it is heading to, then the camera settles on its focus. */
function Clip({
  index,
  dir,
  vw,
  vh,
  paused,
  label,
}: {
  index: number;
  dir: number;
  vw: number;
  vh: number;
  paused: boolean;
  label: string;
}) {
  const s = STEPS[index];
  const [f, setF] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused]);
  const focus = s.focus[f];
  const start = cam(720, 300, 1, vw, vh);
  const to = cam(focus.cx, focus.cy, focus.z, vw, vh);
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-surface shadow-[-24px_0_40px_rgb(14_23_38/0.18)]"
      custom={dir}
      variants={SWIPE}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.5, ease: [0.87, 0, 0.13, 1] }}
    >
      <motion.div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: CAP.w, height: CAP.h }}
        initial={start}
        animate={to}
        transition={{ duration: 0.9, delay: f === 0 ? 0.5 : 0, ease: ease.smooth }}
      >
        <video
          ref={video}
          aria-label={label}
          className="size-full object-cover"
          src={`${s.src}.mp4`}
          poster={`${s.src}.jpg`}
          muted
          loop
          autoPlay={!paused}
          playsInline
          preload="auto"
          onTimeUpdate={(e) => {
            const now = e.currentTarget.currentTime;
            let k = 0;
            s.focus.forEach((x, i) => {
              if (now >= x.t) k = i;
            });
            if (k !== f) setF(k);
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/** A still of the step, cropped around its last focus point so the UI text stays legible on phones. */
function FocusStill({ index, alt }: { index: number; alt: string }) {
  const s = STEPS[index];
  const f = s.focus[s.focus.length - 1];
  const Z = 2.6; // shows about a 550 px wide region of the 1440 px capture
  const clamp = (v: number, lo: number) => Math.min(0, Math.max(lo, v));
  const left = clamp(0.5 - (Z * f.cx) / CAP.w, 1 - Z) * 100;
  const top = clamp(0.375 - (Z * (CAP.h / CAP.w) * f.cy) / CAP.h, 0.75 - Z * (CAP.h / CAP.w)) * 100;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface">
      {/* biome-ignore lint/performance/noImgElement: a fixed still from the clip; no optimisation needed */}
      <img
        src={`${s.src}.jpg`}
        alt={alt}
        className="absolute top-0 max-w-none"
        style={{ left: `${left}%`, marginTop: `${top}%`, width: `${Z * 100}%` }}
      />
    </div>
  );
}

/** Narrow screens and reduced motion: each step as its own panel, with a legible still. */
function FeatureList() {
  const reduced = useReducedMotion();
  const { t } = useLocale();
  const L = t.landing;
  return (
    <section aria-label={L.tour.map((s) => s.label).join(" · ")} className="bg-paper">
      <div className="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-14">
        {STEPS.map((s, i) => {
          const info = L.tour[i];
          return (
            <motion.figure
              key={s.src}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: ease.settle }}
            >
              <figcaption className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-ink-3">{`0${i + 1}`}</span>
                <span className="font-display text-xl font-bold text-ink">{info.label}</span>
                {info.meta && (
                  <span className="font-sans text-sm font-semibold text-brand">{info.meta}</span>
                )}
              </figcaption>
              <FocusStill index={i} alt={info.label} />
              <p className="mt-3 font-sans text-base leading-[1.55] text-ink-2">{info.caption}</p>
            </motion.figure>
          );
        })}
      </div>
      <FooterNote>{L.tourNote}</FooterNote>
    </section>
  );
}
