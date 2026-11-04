"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useLocale } from "@/components/providers";
import { ease } from "@/lib/motion";

/**
 * The large flat phone the camera lands on (the film's centred phone). The screen is laid out at a
 * fixed design size (620×880, like the film) and scaled to `screenH` pixels, so type stays in
 * proportion at any viewport. The bezel is 1.4/88 of the screen height, matching the figurine's phone.
 */
export const SCREEN = { w: 620, h: 880 } as const;

export function Phone({ screenH, children }: { screenH: number; children: ReactNode }) {
  const k = screenH / SCREEN.h;
  const bezel = Math.max(6, Math.round((screenH * 1.4) / 88));
  return (
    <div
      className="relative bg-[#141A26] shadow-[0_30px_70px_rgb(14_23_38/0.28)]"
      style={{
        width: SCREEN.w * k + bezel * 2,
        height: screenH + bezel * 2,
        padding: bezel,
        borderRadius: 65 * k + bezel,
      }}
    >
      <div
        className="relative overflow-hidden bg-paper"
        style={{ width: SCREEN.w * k, height: screenH, borderRadius: 50 * k }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: SCREEN.w, height: SCREEN.h, transform: `scale(${k})` }}
        >
          <StatusBar />
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 flex h-11 items-center justify-between px-8 font-sans text-[20px] font-bold text-ink">
      <span>6:41</span>
      <svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="28"
          height="14"
          rx="4"
          fill="none"
          stroke="#0E1726"
          strokeWidth="2"
        />
        <rect x="4" y="4" width="19" height="8" rx="2" fill="#0E1726" />
        <rect x="30.5" y="5" width="2.5" height="6" rx="1" fill="#0E1726" />
      </svg>
    </div>
  );
}

const drop = {
  initial: { opacity: 0, y: -50 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
} as const;

/** The search: four results, four different thresholds (each a real law, valid at a different time). */
export function SearchScreen({
  shown,
  jitter,
  news,
}: {
  shown: number;
  jitter: boolean;
  news: boolean;
}) {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <>
      <div className="absolute top-[58px] left-7 h-16 w-[564px] overflow-hidden rounded-full border-2 border-line bg-surface px-6 py-[17px] font-sans text-[23px] whitespace-nowrap text-ink-2">
        {L.search}
      </div>
      <motion.div
        className="absolute top-[146px] left-7 w-[564px]"
        animate={jitter ? { x: [0, 10, -10, 8, -6, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5, ease: "linear" }}
      >
        <AnimatePresence initial={false}>
          {L.answers.slice(0, shown).map(([fig, src], i) => (
            <motion.div
              key={src}
              {...drop}
              className="absolute left-0 w-[564px] rounded-[20px] border-2 border-line bg-surface px-6 py-[18px] shadow-[0_6px_16px_rgb(14_23_38/0.06)]"
              style={{ top: i * 176 }}
            >
              <div className="font-mono text-[19px] text-ink-3">{L.result(i + 1)}</div>
              <div className="mt-1 font-display text-[44px] font-extrabold leading-tight text-ink">
                {fig}
              </div>
              <div className="mt-0.5 font-mono text-[21px] text-ink-2">{src}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {news && (
          <motion.div
            key="news"
            initial={{ opacity: 0, y: -150 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.settle } }}
            exit={{ opacity: 0, y: -150, transition: { duration: 0.3, ease: ease.exit } }}
            className="absolute top-3.5 left-4 w-[588px] rounded-[22px] border border-line bg-surface px-[22px] py-[18px] shadow-[0_16px_36px_rgb(14_23_38/0.22)]"
          >
            <div className="font-mono text-[18px] text-ink-3">{L.newsTag}</div>
            <div className="mt-1.5 font-sans text-[25px] leading-[1.3] font-bold text-ink">
              <span className="text-amber">{L.newsStat}</span> {L.news}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** A typical AI search: plain RAG answering the A01 test question (verbatim output from the eval run). */
export function ChatScreen({ answer }: { answer: boolean }) {
  const { t } = useLocale();
  const L = t.landing;
  return (
    <>
      <div className="absolute top-11 left-0 flex h-[70px] w-[620px] items-center gap-3 border-b-2 border-line px-[30px]">
        <div className="flex size-9 items-center justify-center rounded-full bg-[#E3E1DC] font-sans text-[18px] font-extrabold text-ink-2">
          AI
        </div>
        <div className="font-sans text-[24px] font-bold text-ink">{L.aiTitle}</div>
        <div className="ml-auto font-mono text-[17px] text-ink-3">{L.aiKind}</div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: ease.settle }}
        className="absolute top-[140px] right-[26px] w-[470px] rounded-[26px_26px_6px_26px] bg-brand px-6 py-[18px] font-sans text-[25px] leading-[1.35] text-white"
      >
        {L.question}
      </motion.div>
      <AnimatePresence>
        {answer && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
            exit={{ opacity: 0 }}
            style={{ transformOrigin: "0% 0%" }}
            className="absolute top-[330px] left-[22px] w-[560px] rounded-[26px_26px_26px_6px] bg-[#EFEDE7] px-6 py-[22px]"
          >
            <p lang="vi" className="font-display text-[24px] leading-[1.42] text-ink">
              Ngưỡng không chịu thuế GTGT áp dụng năm 2026 là 500 triệu đồng/năm, không phải 1 tỷ.
              Hộ cà phê doanh thu 700 triệu đồng/năm (&gt;500 triệu) thuộc đối tượng CHỊU thuế GTGT…
            </p>
            {L.gloss && (
              <p className="mt-3 font-sans text-[21px] leading-[1.35] text-ink-2 italic">
                {L.gloss}
              </p>
            )}
            <p className="mt-3 font-mono text-[19px] text-ink-2">{L.cited}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
