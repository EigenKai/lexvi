"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/providers";
import { type BenchmarkRow, benchmark } from "@/lib/benchmark/data";
import { QUESTIONS_EN } from "@/lib/landing/questions";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { FooterNote, Odometer } from "./bits";

type Mark = "out" | "basis" | "ok";
const mark = (r: BenchmarkRow["rag_thuong"]): Mark =>
  r.dan_dieu_cu ? "out" : r.dung_can_cu ? "ok" : "basis";

/**
 * The proof: the 20 real test questions zigzag down a spine as you scroll, and the counters tick
 * as each one lands. Every mark comes from the imported eval run (lib/benchmark/results.json).
 * Hidden when no real run is available — never placeholder numbers.
 */
export function Proof() {
  const { t, locale } = useLocale();
  const L = t.landing;
  const reduced = useReducedMotion();
  // Pinned counters only where they leave room for the list; elsewhere they follow it, as totals.
  const pinned = useMediaQuery("(min-width: 768px) and (min-height: 700px)");
  const rows = benchmark?.rows ?? [];
  const [seen, setSeen] = useState<Set<number>>(
    () => new Set(reduced ? rows.map((r) => r.cau) : []),
  );
  if (!benchmark || rows.length === 0) return null;
  const marks = rows.map((r) => ({ cau: r.cau, plain: mark(r.rag_thuong), lexvi: mark(r.lexvi) }));
  const count = (sys: "plain" | "lexvi", m: Mark, all = !pinned) =>
    marks.filter((x) => (all || seen.has(x.cau)) && x[sys] === m).length;
  const MARK_TEXT: Record<Mark, string> = { out: L.markOut, basis: L.markBasis, ok: L.markOk };
  const MARK_COLOR: Record<Mark, string> = {
    out: "text-crimson",
    basis: "text-amber",
    ok: "text-jade",
  };
  const DOT: Record<Mark, string> = { out: "bg-crimson", basis: "bg-amber", ok: "bg-jade" };
  const n = benchmark.n;

  const counter = (sys: "plain" | "lexvi", name: string) => (
    <div
      className={cn(
        "flex flex-col gap-1",
        sys === "plain" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <div className="font-mono text-xs tracking-[0.14em] text-ink-2 uppercase sm:text-sm">
        {name}
      </div>
      <div className="flex items-baseline gap-2 font-mono text-[0.6875rem] text-ink-3 sm:gap-3 sm:text-sm">
        <span>{L.outdated}</span>
        <Odometer
          value={String(count(sys, "out"))}
          className={cn(
            "font-display text-4xl font-extrabold sm:text-6xl",
            sys === "plain" ? "text-crimson" : "text-jade",
          )}
        />
      </div>
      <div className="flex items-baseline gap-2 font-mono text-[0.6875rem] text-ink-3 sm:gap-3 sm:text-sm">
        <span>{L.basis}</span>
        <Odometer
          value={String(count(sys, "ok"))}
          className={cn(
            "font-display text-4xl font-extrabold sm:text-6xl",
            sys === "plain" ? "text-ink" : "text-jade",
          )}
        />
        <span>/{n}</span>
      </div>
    </div>
  );

  const counters = (where: string) => (
    <div
      aria-hidden
      className={cn("border-y border-line bg-[#F5EDDD]/95 py-4 backdrop-blur", where)}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-start gap-4 px-4 sm:gap-10">
        {counter("plain", L.plain)}
        <div className="h-full w-px bg-[#C9C3B6]" />
        {counter("lexvi", L.lexvi)}
      </div>
      <p className="mt-2 text-center font-sans text-xs text-ink-3">{L.byDesign}</p>
    </div>
  );

  return (
    <section
      aria-labelledby="proof-title"
      className="relative bg-[linear-gradient(180deg,#F6EEDF_0%,#EFE2CB_100%)]"
    >
      <div className="px-4 pt-20 text-center">
        <p className="font-mono text-sm text-ink-2">{L.proofKicker}</p>
        <h2
          id="proof-title"
          className="mt-2 font-display text-[clamp(2rem,4.4vw,3.75rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink"
        >
          {L.proofTitle}
        </h2>
      </div>
      <p className="sr-only">
        {`${L.plain}: ${count("plain", "out", true)} ${L.outdated}, ${count("plain", "ok", true)}/${n} ${L.basis}. ${L.lexvi}: ${count("lexvi", "out", true)} ${L.outdated}, ${count("lexvi", "ok", true)}/${n} ${L.basis}.`}
      </p>
      {/* counters stay pinned while the questions pass */}
      {pinned && counters("sticky top-16 z-10 mt-8")}
      <ol className="relative mx-auto max-w-6xl px-4 py-12">
        <div
          aria-hidden
          className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#C9C3B6] max-md:left-6"
        />
        {rows.map((r, i) => {
          const m = marks[i];
          const left = i % 2 === 0;
          const q = locale === "vi" ? r.cau_hoi : (QUESTIONS_EN[r.cau] ?? r.cau_hoi);
          return (
            <motion.li
              key={r.cau}
              lang={locale === "vi" ? "vi" : undefined}
              className={cn(
                "relative mb-3 flex md:w-1/2",
                left ? "md:mr-auto md:pr-10" : "md:ml-auto md:pl-10",
                "max-md:pl-14",
              )}
              initial={reduced ? false : { opacity: 0, x: left ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.4, ease: ease.settle }}
              onViewportEnter={() =>
                setSeen((prev) => (prev.has(r.cau) ? prev : new Set(prev).add(r.cau)))
              }
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full ring-4 ring-[#F2E8D7]",
                  DOT[m.plain],
                  left ? "md:-right-[7px]" : "md:-left-[7px]",
                  "max-md:left-[17px]",
                )}
              />
              <div className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1">
                <span className="font-mono text-sm font-semibold text-brand">
                  A{String(r.cau).padStart(2, "0")}
                </span>
                <span className="flex-1 font-sans text-[0.9375rem] leading-[1.35] text-ink max-md:min-w-[11rem]">
                  {q}
                </span>
                <span className="flex flex-col items-end gap-0.5 font-mono text-xs whitespace-nowrap max-md:w-full max-md:flex-row max-md:justify-end max-md:gap-4">
                  <span className={MARK_COLOR[m.plain]}>
                    {L.plainShort} {MARK_TEXT[m.plain]}
                  </span>
                  <span className={MARK_COLOR[m.lexvi]}>
                    {L.lexvi} {MARK_TEXT[m.lexvi]}
                  </span>
                </span>
              </div>
            </motion.li>
          );
        })}
      </ol>
      {!pinned && counters("mb-10")}
      <div className="pb-14 text-center">
        <Link
          href="/kiem-thu"
          className="inline-flex min-h-11 items-center font-sans font-semibold text-brand underline underline-offset-4 hover:text-ink"
        >
          {L.proofLink} →
        </Link>
      </div>
      <FooterNote>{L.proofNote}</FooterNote>
    </section>
  );
}
