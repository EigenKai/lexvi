"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { Caption, FooterNote } from "./bits";
import { CafeScene, type Pose } from "./cafe-scene";

/** ≈ 24 million VND: an illustrative estimate (rates and assumption in the footer note). */
const SAVED = 24_000_000;

/**
 * Back at the café: good news, a cheer, then a call to his accountant — the sign flips to OPEN.
 * Plays once when the scene is half in view; reduced motion shows the end state.
 * Wide, tall screens put the bubble and the call in the picture; phones and short screens stack
 * them under it at a readable size, and keep them once shown (no layout jumps).
 */
export function Saved() {
  const { t, locale } = useLocale();
  const L = t.landing;
  const reduced = useReducedMotion();
  const wide = useMediaQuery("(min-width: 768px) and (min-height: 600px)");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [step, setStep] = useState(0);
  const done = step >= 4;
  const num = useMotionValue(reduced ? SAVED : 0);
  const fmt = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");
  const text = useTransform(num, (v) => `≈ ${fmt.format(Math.round(v / 100_000) * 100_000)} VND`);

  useEffect(() => {
    if (reduced) {
      num.set(SAVED);
      setStep(4);
      return;
    }
    if (done) return;
    if (!inView) {
      // left before the end: start over next time it comes into view
      setStep(0);
      num.set(0);
      return;
    }
    const timers = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => {
        setStep(2);
        animate(num, SAVED, { duration: 2, ease: ease.settle });
      }, 700),
      setTimeout(() => setStep(3), 4200),
      setTimeout(() => setStep(4), 5600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduced, num, done]);

  const pose: Pose = reduced ? "ear" : step === 2 ? "joy" : step >= 3 ? "ear" : "up";
  // In the picture the bubble makes way for the call; stacked, both stay once shown.
  const bubble = wide && !reduced ? step === 2 : step >= 2;
  const calling = step >= 3;
  const caption = step >= 3 ? L.callLine : step >= 1 ? L.savedLine : null;

  const bubbleBox = (big: boolean) => (
    <div
      className={
        big
          ? "relative rounded-[1.6cqw] border-[3px] border-ink bg-surface px-[1.6cqw] py-[1cqw] shadow-[0_14px_30px_rgb(14_23_38/0.12)]"
          : "relative max-w-full rounded-2xl border-[3px] border-ink bg-surface px-5 py-3 shadow-[0_14px_30px_rgb(14_23_38/0.12)]"
      }
    >
      <motion.div
        className={
          big
            ? "font-display text-[2.9cqw] font-extrabold whitespace-nowrap text-gold tabular-nums"
            : "font-display text-[clamp(1.6rem,7vw,2.25rem)] leading-tight font-extrabold text-gold tabular-nums"
        }
      >
        {text}
      </motion.div>
      <div className={big ? "font-mono text-[1.25cqw] text-ink-2" : "font-mono text-sm text-ink-2"}>
        {L.savedSub}
      </div>
      {big && (
        <div className="absolute -bottom-[11px] left-[10%] size-5 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-surface" />
      )}
    </div>
  );
  const callBox = (big: boolean) => (
    <div
      className={
        big
          ? "rounded-full border-[3px] border-ink bg-surface px-[1.6cqw] py-[0.7cqw] font-sans text-[1.77cqw] font-bold whitespace-nowrap text-ink shadow-[0_14px_30px_rgb(14_23_38/0.12)]"
          : "rounded-full border-[3px] border-ink bg-surface px-5 py-2 font-sans text-lg font-bold text-ink shadow-[0_14px_30px_rgb(14_23_38/0.12)]"
      }
    >
      {L.calling}
    </div>
  );

  return (
    <section aria-label={L.savedLine} className="relative overflow-hidden bg-[#F4ECDD]">
      <div ref={ref} className={wide ? "relative h-[min(100dvh,62rem)] min-h-[34rem]" : "relative"}>
        <div
          className={
            wide
              ? "absolute bottom-14 left-1/2 aspect-[16/9] w-[min(100vw,calc((100dvh-9rem)*16/9))] -translate-x-1/2"
              : "relative mx-auto mt-16 aspect-[16/9] w-full max-w-3xl"
          }
          style={{ containerType: "inline-size" }}
        >
          <CafeScene
            pose={pose}
            happy={step >= 1}
            bright
            open={step >= 4}
            className="absolute inset-0 size-full"
          />
          {wide && (
            <AnimatePresence>
              {bubble && (
                <motion.div
                  key="bubble"
                  className="absolute top-[24.3%] left-[41%] origin-bottom-left"
                  initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  {bubbleBox(true)}
                </motion.div>
              )}
              {calling && !reduced && (
                <motion.div
                  key="call"
                  className="absolute top-[20.4%] left-[43.75%]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: ease.settle }}
                >
                  {callBox(true)}
                </motion.div>
              )}
            </AnimatePresence>
          )}
          {calling && (
            <svg
              aria-hidden="true"
              viewBox="0 0 90 110"
              className="absolute top-[29.4%] left-[41.1%] w-[4.7%]"
            >
              {[0, 1].map((k) => (
                <motion.path
                  key={k}
                  d={k === 0 ? "M14 30 Q34 55 14 80" : "M38 16 Q68 55 38 94"}
                  stroke="#1D3A8A"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 0.2, 1, 0.2, 1] }}
                  transition={{ duration: 1.8, delay: k * 0.15, ease: "easeInOut" }}
                />
              ))}
            </svg>
          )}
        </div>
        {/* narrow or short screens: the same beats under the picture, reserved space, readable */}
        {!wide && (
          <div className="flex min-h-[9.5rem] flex-col items-center gap-3 px-4 pt-6">
            {bubble && bubbleBox(false)}
            {calling && callBox(false)}
          </div>
        )}
        <div className={wide ? "absolute inset-x-0 bottom-12 z-10 px-4" : "px-4 py-4"}>
          <AnimatePresence mode="wait">
            {caption && <Caption key={caption} text={caption} minh />}
          </AnimatePresence>
        </div>
      </div>
      <FooterNote>{L.savedNote}</FooterNote>
    </section>
  );
}
