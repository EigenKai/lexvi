"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  Caption,
  FooterNote,
  KineticLine,
  Mark,
  MetaPill,
  TryButton,
  TryLiveLink,
  WatchButton,
} from "./bits";
import { CafeScene, PHONE_SCREEN } from "./cafe-scene";
import { ChatScreen, Phone, SearchScreen } from "./phone";

/**
 * Mr. Minh's morning, as one scroll (the film's first act): the café at dawn with the title and both
 * buttons → he lifts his phone → the camera zooms into it → four answers → the AI answer, stamped
 * "no longer in force" across the whole screen → everything collapses to a point → the LexVi mark.
 * Big screens get the sticky, scroll-driven version; phones and reduced motion get stacked panels.
 */
export function Story({ onWatch }: { onWatch: () => void }) {
  const reduced = useReducedMotion();
  const roomy = useMediaQuery("(min-width: 768px) and (min-height: 560px)");
  return reduced || !roomy ? <StoryStack onWatch={onWatch} /> : <StoryScroll onWatch={onWatch} />;
}

/* Scroll thresholds (progress through the 620vh section) and what each one switches on. */
const TH = [0.08, 0.3, 0.34, 0.37, 0.4, 0.43, 0.47, 0.51, 0.57, 0.61, 0.68, 0.86, 0.945];
const P = {
  up: 1,
  phone: 2,
  cards: 3,
  jitter: 7,
  news: 8,
  chat: 9,
  answer: 10,
  stamp: 11,
  dot: 12,
  logo: 13,
};

function useViewport() {
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return vp;
}

function Hero({ onWatch }: { onWatch: () => void }) {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <p className="font-mono text-sm tracking-[0.04em] text-ink-2">{L.place}</p>
      <h1 className="mt-3 font-display text-[clamp(2.4rem,5.2vw,4.75rem)] leading-[1.04] font-extrabold tracking-[-0.02em] text-ink">
        <KineticLine text={L.title} delay={0.15} />
      </h1>
      <p className="mt-4 max-w-[44rem] font-sans text-[clamp(1rem,1.35vw,1.1875rem)] leading-[1.55] text-ink-2">
        {L.sub}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <WatchButton onClick={onWatch} />
        <TryButton />
        <TryLiveLink />
      </div>
      <MetaPill text={L.builtOn} className="mt-4" />
    </div>
  );
}

function StoryScroll({ onWatch }: { onWatch: () => void }) {
  const { t } = useLocale();
  const L = t.landing;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const { w: vw, h: vh } = useViewport();

  // Layout: the café sits at the bottom of the frame; the title lives on the wall above it.
  const sceneH = Math.min(vh * 0.58, (vw * 9) / 16);
  const sceneW = (sceneH * 16) / 9;
  const left = (vw - sceneW) / 2;
  const top = vh - sceneH;
  const s = sceneW / 1920;
  const px = left + (PHONE_SCREEN.x + PHONE_SCREEN.w / 2) * s;
  const py = top + (PHONE_SCREEN.y + PHONE_SCREEN.h / 2) * s;
  const screenH = Math.round(vh * 0.76);
  const Z = screenH / (PHONE_SCREEN.h * s);
  const lay = useRef({ vw, vh, px, py, Z });
  lay.current = { vw, vh, px, py, Z };

  const [phase, setPhase] = useState(0);
  const sync = (v: number) => setPhase(TH.filter((x) => v >= x).length);
  useMotionValueEvent(p, "change", sync);
  // biome-ignore lint/correctness/useExhaustiveDependencies: read the starting position once
  useEffect(() => sync(p.get()), []);

  // The title lifts away; the camera zooms log-linearly into the phone (ease-in), the phone takes over.
  const titleOpacity = useTransform(p, [0.03, 0.08], [1, 0]);
  const titleY = useTransform(p, [0.03, 0.08], [0, -40]);
  const zoom = useTransform(p, [0.12, 0.3], [0, 1], { clamp: true });
  const scale = useTransform(zoom, (v) => lay.current.Z ** (v ** 1.5));
  const x = useTransform(
    scale,
    (sc) => ((lay.current.vw / 2 - lay.current.px) * (sc - 1)) / (lay.current.Z - 1),
  );
  const y = useTransform(
    scale,
    (sc) => ((lay.current.vh / 2 - lay.current.py) * (sc - 1)) / (lay.current.Z - 1),
  );
  const cafeOpacity = useTransform(p, [0.296, 0.306], [1, 0]);
  const phoneOpacity = useTransform(p, [0.29, 0.3], [0, 1]);
  // Everything collapses into one point, which grows into the mark.
  const collapse = useTransform(p, [0.76, 0.86], [1, 0.004], { ease: (v) => v ** 4 });
  const collapseFade = useTransform(p, [0.858, 0.87], [1, 0]);
  const dotScale = useTransform(p, [0.88, 0.94], [28 / 200, 1], { clamp: true });
  const dotRadius = useTransform(p, [0.88, 0.94], ["50%", "27%"]);
  const markOpacity = useTransform(p, [0.93, 0.945], [0, 1]);

  const pose = phase >= P.up ? "up" : "rest";
  const shown = Math.max(0, Math.min(4, phase - P.cards + 1));
  const caption =
    phase >= P.stamp
      ? null
      : phase >= P.chat
        ? L.minh4
        : phase >= P.jitter
          ? L.minh3
          : phase >= P.cards
            ? L.minh2
            : phase >= P.up
              ? L.minh1
              : null;
  const note = phase >= P.dot ? null : phase >= P.chat ? L.aiNote : L.storyNote;

  return (
    <section ref={ref} aria-label={L.title} className="relative" style={{ height: "620vh" }}>
      <div className="sticky top-0 h-dvh overflow-hidden bg-paper">
        {/* everything that collapses into the point */}
        <motion.div
          className="absolute inset-0"
          style={{
            scale: collapse,
            opacity: collapseFade,
            // the mark's centre: the column (200 px mark + 24 px gap + 13 rem text) is centred
            transformOrigin: "50% calc(50% - 116px)",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#E9DCC6_0%,#D9C3A0_100%)]" />
          <motion.div
            className="absolute inset-0"
            animate={phase >= P.stamp ? { x: [0, -16, 16, -12, 12, -6, 0] } : { x: 0 }}
            transition={{ duration: 0.35, delay: 0.28, ease: "linear" }}
          >
            {/* the café, with the camera move */}
            <motion.div
              className="absolute inset-0"
              style={{ scale, x, y, opacity: cafeOpacity, transformOrigin: `${px}px ${py}px` }}
            >
              <CafeScene
                pose={pose}
                className="absolute"
                style={{ left, top, width: sceneW, height: sceneH }}
              />
            </motion.div>
            {/* the zoomed-in phone */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: phoneOpacity }}
            >
              <Phone screenH={screenH}>
                <AnimatePresence mode="wait" initial={false}>
                  {phase < P.chat ? (
                    <motion.div
                      key="search"
                      className="absolute inset-0"
                      exit={{ x: -620, transition: { duration: 0.35, ease: ease.exit } }}
                    >
                      <SearchScreen
                        shown={shown}
                        jitter={phase >= P.jitter}
                        news={phase >= P.news}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat"
                      className="absolute inset-0"
                      initial={{ x: 620 }}
                      animate={{ x: 0, transition: { duration: 0.4, ease: ease.settle } }}
                    >
                      <ChatScreen answer={phase >= P.answer} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Phone>
            </motion.div>
            {/* the stamp, across the whole screen */}
            <AnimatePresence>
              {phase >= P.stamp && (
                <motion.div
                  key="stamp"
                  className="absolute top-1/2 left-1/2 w-[min(1500px,92vw)]"
                  style={{ x: "-50%", y: "-50%" }}
                  initial={{ opacity: 0, scale: 2.4, rotate: -14 }}
                  animate={{ opacity: 1, scale: 1, rotate: -6 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: [0.7, 0, 0.84, 0] }}
                >
                  <div className="rounded-[28px] border-[12px] border-crimson bg-paper/95 px-8 py-6 text-center text-crimson">
                    <div className="font-display text-[clamp(2.2rem,6vw,7rem)] leading-none font-extrabold tracking-[-0.01em] text-balance uppercase">
                      ✕ {L.stamp}
                    </div>
                    <div className="mt-4 font-sans text-[clamp(1rem,1.9vw,1.9rem)] leading-[1.35] font-semibold">
                      {L.stampSub}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* the point, then the mark */}
        {phase >= P.dot && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative size-[200px]">
              <motion.div
                className="absolute inset-[7px] bg-brand"
                style={{ scale: dotScale, borderRadius: dotRadius }}
              />
              <motion.div className="absolute inset-0" style={{ opacity: markOpacity }}>
                <Mark className="size-full" />
              </motion.div>
            </div>
            <div className="mt-6 h-[13rem] text-center">
              <AnimatePresence>
                {phase >= P.logo && (
                  <motion.div
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      transitionEnd: { filter: "none" },
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: ease.settle }}
                  >
                    <div className="font-display text-[clamp(3.5rem,7vw,7rem)] leading-none font-extrabold tracking-[-0.02em] text-ink">
                      {t.brand}
                    </div>
                    <p className="mt-3 font-sans text-lg text-ink-2">{L.arrive}</p>
                    <MetaPill text={L.builtOn} className="mt-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* the title and both buttons, on the wall above the café */}
        <motion.div
          className="absolute inset-x-0"
          // Once the title has lifted away its buttons must not take focus while invisible.
          inert={phase >= P.up}
          style={{
            top: Math.max(76, vh * 0.1),
            opacity: titleOpacity,
            y: titleY,
            pointerEvents: phase >= P.up ? "none" : "auto",
          }}
        >
          <Hero onWatch={onWatch} />
        </motion.div>
        <motion.p
          aria-hidden
          className="absolute inset-x-0 bottom-14 text-center font-mono text-xs tracking-[0.12em] text-ink-2 uppercase"
          style={{ opacity: titleOpacity }}
        >
          {L.scroll} ↓
        </motion.p>

        <div className="absolute inset-x-0 bottom-12 px-4">
          <AnimatePresence mode="wait">
            {caption && <Caption key={caption} text={caption} minh />}
          </AnimatePresence>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <AnimatePresence mode="wait">
            {note && <FooterNote key={note}>{note}</FooterNote>}
          </AnimatePresence>
        </div>
      </div>
      <StoryText />
    </section>
  );
}

/** The scroll-driven beats as plain text for screen readers (they appear only at scroll positions). */
function StoryText() {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <div className="sr-only">
      <p>{L.minh1}</p>
      <p>{L.minh2}</p>
      <ul>
        {L.answers.map(([fig, src]) => (
          <li key={src}>
            {fig} · {src}
          </li>
        ))}
      </ul>
      <p>
        {L.newsTag}: {L.newsStat} {L.news}
      </p>
      <p>{L.minh4}</p>
      <p>{L.question}</p>
      <p lang="vi">
        Ngưỡng không chịu thuế GTGT áp dụng năm 2026 là 500 triệu đồng/năm, không phải 1 tỷ. Hộ cà
        phê doanh thu 700 triệu đồng/năm (&gt;500 triệu) thuộc đối tượng CHỊU thuế GTGT…
      </p>
      {L.gloss && <p>{L.gloss}</p>}
      <p>{L.cited}</p>
      <p>
        {L.stamp}: {L.stampSub}
      </p>
      <p>{L.aiNote}</p>
    </div>
  );
}

/** Phones and reduced motion: the same beats as stacked panels, each settling in once. */
function StoryStack({ onWatch }: { onWatch: () => void }) {
  const { t } = useLocale();
  const L = t.landing;
  const [phoneW, setPhoneW] = useState(340);
  useEffect(() => {
    const read = () => setPhoneW(Math.min(window.innerWidth * 0.86, 380));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const screenH = Math.round((phoneW * 880) / 620);
  const inView = {
    initial: "hidden",
    whileInView: "shown",
    viewport: { once: true, amount: 0.3 },
  } as const;
  const rise = {
    hidden: { opacity: 0, y: 24 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: ease.settle } },
  };
  return (
    <section aria-label={L.title} className="bg-[linear-gradient(180deg,#F4EADA_0%,#E6D3B5_100%)]">
      <div className="pt-24 pb-6">
        <Hero onWatch={onWatch} />
      </div>
      <div className="relative mx-auto aspect-[16/10] w-full max-w-5xl overflow-hidden">
        <CafeScene pose="up" className="absolute inset-0 size-full" />
      </div>
      <FooterNote>{L.storyNote}</FooterNote>
      <div className="flex flex-col items-center gap-10 bg-[linear-gradient(180deg,#E9DCC6_0%,#D9C3A0_100%)] px-4 py-14">
        <Caption text={L.minh1} minh />
        <Caption text={L.minh2} minh />
        <motion.div {...inView} variants={rise}>
          <Phone screenH={screenH}>
            <SearchScreen shown={4} jitter={false} news />
          </Phone>
        </motion.div>
        <Caption text={L.minh3} minh />
        <Caption text={L.minh4} minh />
        <motion.div {...inView} variants={rise} className="relative">
          <Phone screenH={screenH}>
            <ChatScreen answer />
          </Phone>
          <motion.div
            className="absolute top-1/2 left-1/2 w-[min(92vw,720px)]"
            style={{ x: "-50%", y: "-50%" }}
            initial={{ opacity: 0, scale: 1.3, rotate: -12 }}
            whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.3, delay: 0.4, ease: [0.7, 0, 0.84, 0] }}
          >
            <div className="rounded-2xl border-8 border-crimson bg-paper/95 px-4 py-3 text-center text-crimson">
              <div className="font-display text-[clamp(1.6rem,7vw,3rem)] leading-none font-extrabold uppercase">
                ✕ {L.stamp}
              </div>
              <div className="mt-2 font-sans text-sm leading-[1.35] font-semibold">
                {L.stampSub}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <FooterNote>{L.aiNote}</FooterNote>
      <motion.div
        {...inView}
        variants={rise}
        className="flex flex-col items-center bg-paper px-6 py-16 text-center"
      >
        <Mark className="size-24" />
        <div className="mt-4 font-display text-5xl font-extrabold tracking-[-0.02em] text-ink">
          {t.brand}
        </div>
        <p className="mt-2 font-sans text-base text-ink-2">{L.arrive}</p>
        <MetaPill text={L.builtOn} className="mt-4" />
      </motion.div>
    </section>
  );
}
