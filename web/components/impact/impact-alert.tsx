"use client";

import { cn } from "cn";
import {
  BookOpen,
  CircleMinus,
  CircleSlash,
  GitCommitHorizontal,
  History,
  type LucideIcon,
  RotateCcw,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "@/components/providers";
import type { DieuBiAnhHuong, IngestResponse, IsoDate, LoaiThayDoi } from "@/lib/api/contract";
import { formatDate, isIsoDate } from "@/lib/format";
import { isRetroactive } from "@/lib/legal-status";
import { duration, ease, presence, presenceReduced } from "@/lib/motion";
import { Checklist } from "../ask/checklist";
import { StatusBadge } from "../status";

/** Relation colour + icon (DESIGN.md §2.2): the word comes from the dictionary. */
const RELATION_STYLE: Record<LoaiThayDoi, { icon: LucideIcon; cls: string }> = {
  sua_doi: { icon: GitCommitHorizontal, cls: "text-amend bg-amend-tint border-amend/30" },
  thay_the: { icon: GitCommitHorizontal, cls: "text-amend bg-amend-tint border-amend/30" },
  bai_bo: { icon: CircleSlash, cls: "text-crimson bg-crimson-tint border-crimson/30" },
  huong_dan: { icon: BookOpen, cls: "text-brand bg-brand-tint border-brand/30" },
};

/** Old text: the strikethrough appears, then the text recedes to 60% (DESIGN.md §10.3). */
function OldText({ text, delayMs }: { text: string; delayMs: number }) {
  const reduced = useReducedMotion();
  const [struck, setStruck] = useState(!!reduced);
  useEffect(() => {
    if (reduced) return setStruck(true);
    const id = setTimeout(() => setStruck(true), delayMs);
    return () => clearTimeout(id);
  }, [reduced, delayMs]);
  return (
    <p
      lang="vi"
      className={cn(
        "font-serif text-[1rem] leading-[1.7] text-ink decoration-2 [text-decoration-line:line-through] transition-[text-decoration-color,opacity] duration-[320ms] ease-[var(--ease-smooth)]",
        struck ? "decoration-crimson opacity-60" : "decoration-transparent",
      )}
    >
      {text}
    </p>
  );
}

function ImpactRow({ row, index }: { row: DieuBiAnhHuong; index: number }) {
  const t = useT();
  const rel = RELATION_STYLE[row.loai];
  const RelIcon = rel.icon;
  return (
    <div
      data-film={`impact-row-${index}`}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            rel.cls,
          )}
        >
          <RelIcon aria-hidden className="size-3.5" />
          {t.relation[row.loai]}
        </span>
        <span className="font-mono text-xs text-ink-2">{row.dieu_bi_tac_dong}</span>
        <span
          data-film={`impact-affects-${index}`}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            row.anh_huong_toi_ho_so
              ? "border-amber/30 bg-amber-tint text-amber"
              : "border-line bg-surface-sunk text-ink-2",
          )}
        >
          {row.anh_huong_toi_ho_so ? (
            <TriangleAlert aria-hidden className="size-3.5" />
          ) : (
            <CircleMinus aria-hidden className="size-3.5" />
          )}
          {row.anh_huong_toi_ho_so ? t.impact.affects : t.impact.notAffects}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-surface-sunk px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-ink-3">
            {t.impact.before} · <span className="font-mono">{row.dieu_cu.so_hieu}</span>
          </p>
          <OldText text={row.dieu_cu.noi_dung} delayMs={900 + index * 160} />
        </div>
        <div className="rounded-md border border-jade/30 bg-jade-tint px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-jade">{t.impact.after}</p>
          <p lang="vi" className="font-serif text-[1rem] leading-[1.7] text-ink">
            {row.trich_doan}
          </p>
        </div>
      </div>

      {row.giai_thich && (
        <p lang="vi" className="text-[0.9375rem] leading-[1.6] text-ink-2">
          {row.giai_thich}
        </p>
      )}
    </div>
  );
}

/**
 * DESIGN.md §4.9 — the alert screen's one choreographed moment: the gold rule sweeps across the
 * top, then the rows enter with Presence and the old text is struck through.
 */
export function ImpactAlert({
  result,
  today,
  onReset,
}: {
  result: IngestResponse;
  today: IsoDate;
  onReset: () => void;
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const variants = reduced ? presenceReduced : presence;
  const rows = result.dieu_bi_anh_huong;
  const affected = rows.filter((r) => r.anh_huong_toi_ho_so).length;
  const vb = result.van_ban_moi;
  const issued = vb.ngay_ban_hanh && isIsoDate(vb.ngay_ban_hanh) ? vb.ngay_ban_hanh : null;
  const from = isIsoDate(vb.hieu_luc_tu) ? vb.hieu_luc_tu : null;

  return (
    <motion.article
      data-film="impact-alert"
      aria-labelledby="impact-heading"
      variants={variants}
      initial="hidden"
      animate="shown"
      className="relative overflow-hidden rounded-lg border border-line bg-paper p-6 shadow-card max-sm:p-4"
    >
      <motion.span
        aria-hidden
        data-film="impact-rule"
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-gold"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: duration.reveal, ease: ease.smooth, delay: 0.15 }}
      />

      <header className="flex flex-col gap-2">
        {/* The demo replays a document already published (Decree 141/2026); say so on screen. */}
        <p data-film="impact-replay" className="text-xs font-semibold text-ink-3">
          {t.impact.replay(vb.so_hieu)}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="impact-heading" className="font-mono text-lg font-medium text-ink">
              {vb.so_hieu}
            </h2>
            <p lang="vi" className="text-[0.9375rem] text-ink-2">
              {vb.tieu_de}
            </p>
            {issued && (
              <p data-film="impact-issued" className="font-mono text-sm text-ink-3 tabular-nums">
                {t.impact.issued(formatDate(issued))}
              </p>
            )}
            {from && (
              <p className="font-mono text-sm text-ink-3 tabular-nums">
                {t.impact.appliesFrom(formatDate(from))}
              </p>
            )}
            {issued && from && isRetroactive(issued, from, from) && (
              <p
                data-film="impact-retroactive"
                className="mt-1 flex items-start gap-2 rounded-md bg-surface-sunk px-3 py-2 text-sm leading-[1.5] text-ink-2"
              >
                <History aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t.impact.retroactive(formatDate(issued), formatDate(from))}
              </p>
            )}
          </div>
          <StatusBadge status="can_xac_nhan" />
        </div>
        <p className="text-sm font-medium text-ink">
          {t.impact.affectedCount(affected, rows.length)}
        </p>
        {t.sourceNote && <p className="text-xs text-ink-3">{t.sourceNote}</p>}
      </header>

      <section className="mt-5" aria-label={t.impact.changes}>
        <h3 className="mb-2 text-sm font-semibold text-ink-2">{t.impact.changes}</h3>
        <motion.ul
          className="flex flex-col gap-3"
          initial="hidden"
          animate="shown"
          variants={{
            shown: {
              transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: reduced ? 0 : 0.5 },
            },
          }}
        >
          {rows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: one excerpt may act on one article twice
            <motion.li key={`${row.dieu_bi_tac_dong}|${row.trich_doan}|${i}`} variants={variants}>
              <ImpactRow row={row} index={i} />
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section className="mt-6" aria-label={t.impact.tasks}>
        <h3 className="mb-3 text-sm font-semibold text-ink-2">{t.impact.tasks}</h3>
        <Checklist
          items={result.viec_can_lam.map(({ viec, han, can_cu }) => ({ viec, han, can_cu }))}
          today={today}
          emptyText={t.impact.noTasks}
          film="impact-tasks"
        />
      </section>

      {result.bi_loai.length > 0 && (
        <details
          data-film="impact-dropped"
          className="mt-6 rounded-md border border-line bg-surface px-4 py-3"
        >
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink-2">
            <ShieldX aria-hidden className="size-4 text-ink-3" />
            {t.impact.dropped(result.bi_loai.length)}
          </summary>
          <p className="mt-1 text-xs text-ink-3">{t.impact.droppedHint}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {result.bi_loai.map((d, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: dropped rows may repeat
                key={`${d.dieu_bi_tac_dong}|${d.trich_doan}|${i}`}
                className="text-sm leading-[1.5]"
              >
                <span lang="vi" className="font-serif text-ink-2">
                  “{d.trich_doan}”
                </span>
                <span lang="vi" className="block text-xs text-crimson">
                  {d.ly_do}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunk"
      >
        <RotateCcw aria-hidden className="size-4" />
        {t.impact.another}
      </button>
    </motion.article>
  );
}
