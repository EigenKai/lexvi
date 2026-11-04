"use client";

import { cn } from "cn";
import { CircleCheck, CircleSlash, FileQuestion } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers";
import {
  type BenchmarkData,
  benchmark,
  type Count,
  EXTRAS,
  METRICS,
  type MetricKey,
  type SystemKey,
} from "@/lib/benchmark/data";
import { formatDate } from "@/lib/format";
import { ease } from "@/lib/motion";

/** Which way is better for each metric (drives the hint word only, never colour alone). */
const DIRECTION: Record<MetricKey, "lower" | "higher" | "reference"> = {
  dan_dieu_cu: "lower",
  dung_can_cu: "higher",
  trich_sai: "lower",
  can_xac_nhan: "reference",
};

/** Odometer-style count-up (DESIGN.md §10.2): rolls to the final count once in view. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) return setShown(value);
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: ease.settle,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, value]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {shown}
    </span>
  );
}

function Bar({ count, tone }: { count: Count; tone: "gold" | "muted" }) {
  const reduced = useReducedMotion();
  const ratio = count.n > 0 ? count.x / count.n : 0;
  return (
    <span
      aria-hidden
      className="relative block h-1.5 w-full overflow-hidden rounded-full bg-night-line/40"
    >
      <motion.span
        className={cn(
          "absolute inset-y-0 left-0 origin-left rounded-full",
          tone === "gold" ? "bg-night-gold" : "bg-night-muted",
        )}
        style={{ width: `${ratio * 100}%` }}
        initial={reduced ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: ease.smooth }}
      />
    </span>
  );
}

function MetricRow({ data, metric }: { data: BenchmarkData; metric: MetricKey }) {
  const t = useT();
  const headline = metric === "dan_dieu_cu";
  const hint =
    DIRECTION[metric] === "lower"
      ? t.bench.lower
      : DIRECTION[metric] === "higher"
        ? t.bench.higher
        : t.bench.reference;
  const systems: [SystemKey, string][] = [
    ["rag_thuong", t.bench.rag],
    ["lexvi", t.bench.lexvi],
  ];
  return (
    <li
      data-film={`benchmark-metric-${metric}`}
      className={cn(
        "rounded-lg border px-5 py-4 max-sm:px-4",
        headline
          ? "border-night-gold/40 bg-night-surface"
          : "border-night-line/60 bg-night-surface/60",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[0.9375rem] font-semibold text-night-text">
          {t.bench.metrics[metric]}
        </h3>
        <span className="text-xs text-night-muted">{hint}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        {systems.map(([sys, label]) => {
          const c = data.summary[sys][metric];
          return (
            <div key={sys} className="flex flex-col gap-1.5">
              <dt className="text-xs font-medium text-night-muted">{label}</dt>
              <dd className="flex items-baseline gap-1 font-display">
                <CountUp
                  value={c.x}
                  className={cn(
                    "text-[2.5rem] leading-[1.1] font-light",
                    headline && sys === "lexvi" ? "text-night-gold" : "text-night-text",
                  )}
                />
                <span className="text-lg text-night-muted tabular-nums">/{c.n}</span>
              </dd>
              <Bar count={c} tone={headline && sys === "lexvi" ? "gold" : "muted"} />
            </div>
          );
        })}
      </dl>
    </li>
  );
}

function OutdatedCell({ outdated }: { outdated: boolean }) {
  const t = useT();
  return outdated ? (
    <span className="inline-flex items-center gap-1.5 text-night-crimson">
      <CircleSlash aria-hidden className="size-4" />
      {t.bench.outdated}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-night-jade">
      <CircleCheck aria-hidden className="size-4" />
      {t.bench.notOutdated}
    </span>
  );
}

function Results({ data }: { data: BenchmarkData }) {
  const t = useT();
  return (
    <section
      data-film="benchmark-panel"
      className="rounded-lg bg-night p-6 text-night-text shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] max-sm:p-4"
    >
      <ul className="flex flex-col gap-3">
        {METRICS.map((m) => (
          <MetricRow key={m} data={data} metric={m} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-night-muted">{t.bench.note}</p>
      <p data-film="benchmark-disclosure" className="mt-1 text-xs text-night-muted">
        {t.bench.byConstruction}
      </p>

      {EXTRAS.some((k) => data.extra.rag_thuong[k] || data.extra.lexvi[k]) && (
        <dl data-film="benchmark-extra" className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {EXTRAS.filter((k) => data.extra.rag_thuong[k] || data.extra.lexvi[k]).map((k) => (
            <div key={k} className="rounded-md border border-night-line/60 px-3 py-2">
              <dt className="text-xs text-night-muted">{t.bench.extra[k]}</dt>
              <dd className="mt-1 flex flex-wrap gap-x-3 font-mono text-night-text tabular-nums">
                {(
                  [
                    ["rag_thuong", t.bench.rag],
                    ["lexvi", t.bench.lexvi],
                  ] as const
                ).map(([sys, label]) => {
                  const c = data.extra[sys][k];
                  return (
                    <span key={sys}>
                      <span className="font-sans text-xs text-night-muted">{label}</span>{" "}
                      {c ? `${c.x}/${c.n}` : "—"}
                    </span>
                  );
                })}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {data.rows.length > 0 && (
        <div data-film="benchmark-table" className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-night-text">{t.bench.table}</h3>
          <div className="overflow-x-auto rounded-md border border-night-line/60">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-night-surface text-xs text-night-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t.bench.colQ}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t.bench.colDate}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t.bench.rag}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t.bench.lexvi}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night-line/40">
                {data.rows.map((r) => (
                  <tr key={r.cau}>
                    <td className="px-3 py-2 font-mono text-night-muted tabular-nums">{r.cau}</td>
                    <td lang="vi" className="px-3 py-2 text-night-text">
                      {r.cau_hoi}
                    </td>
                    <td className="px-3 py-2 font-mono text-night-muted tabular-nums">
                      {/^\d{4}-\d{2}-\d{2}$/.test(r.ngay_ap_dung)
                        ? formatDate(r.ngay_ap_dung)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <OutdatedCell outdated={r.rag_thuong.dan_dieu_cu} />
                    </td>
                    <td className="px-3 py-2">
                      <OutdatedCell outdated={r.lexvi.dan_dieu_cu} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 border-t border-night-line/60 pt-3 text-xs text-night-muted">
        {t.bench.footer(
          data.n,
          data.model,
          /^\d{4}-\d{2}-\d{2}$/.test(data.generated_at)
            ? formatDate(data.generated_at)
            : data.generated_at,
        )}
        {data.source_file && (
          <>
            {" · "}
            {t.bench.source}: <span className="font-mono">{data.source_file}</span>
          </>
        )}
      </p>
    </section>
  );
}

/** DESIGN.md §4.12 — LexVi vs plain RAG on the team-written test set, as counts with N. */
export function BenchmarkScreen() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 pt-10 pb-16 max-sm:px-4 max-sm:pt-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] text-ink max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
          {t.bench.title}
        </h1>
        <p className="text-ink-2">{t.bench.subtitle}</p>
      </header>
      {benchmark ? (
        <Results data={benchmark} />
      ) : (
        <section
          data-film="benchmark-empty"
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center"
        >
          <FileQuestion aria-hidden className="size-8 text-ink-3" />
          <h2 className="text-base font-semibold text-ink">{t.bench.emptyTitle}</h2>
          <p className="max-w-[56ch] text-sm text-ink-2">{t.bench.emptyBody}</p>
        </section>
      )}
    </div>
  );
}
