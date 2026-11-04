"use client";

import { UserCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useT } from "@/components/providers";
import { usingMock } from "@/lib/api/client";
import type { AskResponseMoRong, IsoDate } from "@/lib/api/contract";
import { formatDate } from "@/lib/format";
import { presence, presenceReduced } from "@/lib/motion";
import { StatusBadge } from "../status";
import { Checklist } from "./checklist";
import { CitationChip, type ResolvedCitation } from "./citation-chip";

/** DESIGN.md §4.2 */
export function AnswerCard({
  response,
  citations,
  applied,
  today,
  onOpenCitation,
}: {
  response: AskResponseMoRong;
  citations: ResolvedCitation[];
  applied: IsoDate;
  today: IsoDate;
  /** Opens the citation at this index of `citations`. */
  onOpenCitation: (index: number) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  // Prepared examples are written in the UI language; live answers are Vietnamese.
  const proseLang = usingMock && locale === "en" ? "en" : "vi";
  const reduced = useReducedMotion();
  const variants = reduced ? presenceReduced : presence;

  return (
    <motion.article
      data-film="answer"
      aria-labelledby="answer-heading"
      variants={variants}
      initial="hidden"
      animate="shown"
      exit="gone"
      className="rounded-lg border border-line bg-surface p-6 shadow-card max-sm:p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="answer-heading"
            className="font-display text-[1.375rem] leading-[1.35] font-semibold"
          >
            {t.answer.heading}
          </h2>
          <p className="text-sm text-ink-3">
            {t.answer.forDate}{" "}
            <span className="font-mono text-ink-2 tabular-nums">{formatDate(applied)}</span>
          </p>
        </div>
        <span data-film="answer-status">
          {response.can_xac_nhan ? (
            <StatusBadge status="can_xac_nhan" />
          ) : (
            <StatusBadge status="con_hieu_luc" label={t.status.verified} />
          )}
        </span>
      </header>

      <p lang={proseLang} className="mt-4 text-[1.125rem] leading-[1.6] text-ink">
        {response.tra_loi}
      </p>
      {t.sourceNote && <p className="mt-1 text-xs text-ink-3">{t.sourceNote}</p>}

      <section className="mt-5" aria-label={t.answer.citations}>
        <h3 className="mb-2 text-sm font-semibold text-ink-2">{t.answer.citations}</h3>
        <motion.ul
          className="flex flex-wrap gap-2"
          initial="hidden"
          animate="shown"
          variants={{
            shown: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: 0.15 } },
          }}
        >
          {citations.map((c, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: one provision may be cited twice; the list is rebuilt per answer
            <motion.li key={`${c.trich.id}|${i}`} variants={variants} className="max-w-full">
              <CitationChip
                citation={c}
                film={`citation-chip-${i}`}
                onOpen={() => onOpenCitation(i)}
              />
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section className="mt-6" aria-label={t.answer.checklist}>
        <h3 className="mb-3 text-sm font-semibold text-ink-2">{t.answer.checklist}</h3>
        <Checklist
          items={response.checklist}
          today={today}
          citations={citations}
          onOpenCitation={onOpenCitation}
        />
      </section>

      <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-sm leading-[1.5] text-ink-2">
        <UserCheck
          aria-hidden
          className={
            response.can_xac_nhan
              ? "mt-0.5 size-4 shrink-0 text-amber"
              : "mt-0.5 size-4 shrink-0 text-ink-3"
          }
        />
        {t.answer.accountantStep}
      </p>
    </motion.article>
  );
}
