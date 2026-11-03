"use client";

import { cn } from "cn";
import { BadgeCheck, CircleSlash, Clock, History } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { IsoDate, NutChuoi } from "@/lib/api/contract";
import { docLabel, formatDate } from "@/lib/format";
import { vi } from "@/lib/i18n/vi";
import {
  appliesFrom,
  chainStates,
  highlightIndex,
  isRetroactive,
  type NodeState,
} from "@/lib/legal-status";
import { duration, ease } from "@/lib/motion";

const EDGE_STAGGER = 0.22;

const STATE_WORD: Record<NodeState, string> = {
  current: vi.status.con_hieu_luc,
  superseded: vi.status.da_sua_doi,
  expired: vi.status.het_hieu_luc,
  future: vi.status.notYet,
};

function Strike({ on, delay, animate }: { on: boolean; delay: number; animate: boolean }) {
  if (!on) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-1/2 h-[1.5px] origin-left bg-crimson"
      initial={animate ? { scaleX: 0 } : false}
      animate={{ scaleX: 1 }}
      transition={{ duration: duration.base, ease: ease.smooth, delay }}
    />
  );
}

function Marker({ state, highlight }: { state: NodeState; highlight: boolean }) {
  if (state === "current" && highlight)
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-jade text-white ring-4 ring-jade-tint">
        <BadgeCheck aria-hidden className="size-4" />
      </span>
    );
  if (state === "current")
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-jade bg-jade-tint" />
    );
  if (state === "future")
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong bg-surface">
        <Clock aria-hidden className="size-3 text-ink-3" />
      </span>
    );
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full border border-crimson/40 bg-crimson-tint">
      <CircleSlash aria-hidden className="size-3 text-crimson" />
    </span>
  );
}

/**
 * DESIGN.md §4.5. Nodes in order of effect; edges labelled with the relation; the node in force on
 * the applied date is jade and enlarged; superseded nodes are crimson-tinted with a struck number.
 * Vertical inside the 480 px drawer (5 nodes do not fit across it); horizontal where there is room.
 */
export function AmendmentChain({
  chain,
  applied,
  orientation = "vertical",
  citedSoHieu,
}: {
  chain: NutChuoi[];
  applied: IsoDate;
  orientation?: "vertical" | "horizontal";
  citedSoHieu?: string;
}) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const states = chainStates(chain, applied);
  // The highlighted node: the last one in force on the applied date.
  const highlight = highlightIndex(chain, states);
  const settleDelay = (chain.length - 1) * EDGE_STAGGER + duration.draw;

  const vertical = orientation === "vertical";

  return (
    <ol
      data-film="amendment-chain"
      aria-label={vi.drawer.chain}
      className={cn(vertical ? "flex flex-col" : "flex items-start gap-0 overflow-x-auto pb-2")}
    >
      {chain.map((n, i) => {
        const state = states[i];
        const struck = state === "superseded" || state === "expired";
        const from = appliesFrom(n);
        const retro = isRetroactive(n.van_ban.ngay_ban_hanh, from, applied);
        const cited = citedSoHieu === n.van_ban.so_hieu;
        return (
          <li
            key={n.van_ban.so_hieu}
            className={cn(vertical ? "flex flex-col" : "flex items-start")}
            data-film={`chain-node-${i}`}
          >
            {i > 0 && n.quan_he && (
              <div
                className={cn(
                  vertical
                    ? "flex h-11 items-stretch gap-3"
                    : "flex w-24 flex-col items-center pt-2",
                )}
              >
                <svg
                  aria-hidden
                  className={cn(
                    "shrink-0 overflow-visible",
                    vertical ? "ml-[13px] h-full w-[2px]" : "h-[2px] w-full",
                  )}
                  viewBox={vertical ? "0 0 2 44" : "0 0 96 2"}
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d={vertical ? "M1 0 V44" : "M0 1 H96"}
                    className={state === "future" ? "stroke-line-strong" : "stroke-jade"}
                    strokeWidth={2}
                    strokeDasharray={state === "future" ? "3 4" : undefined}
                    vectorEffect="non-scaling-stroke"
                    initial={animate ? { pathLength: 0 } : false}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: duration.draw,
                      ease: ease.smooth,
                      delay: (i - 1) * EDGE_STAGGER,
                    }}
                  />
                </svg>
                <span
                  className={cn(
                    "text-xs font-medium text-ink-3",
                    vertical ? "self-center pl-4" : "mt-1",
                  )}
                >
                  {vi.relation[n.quan_he]}
                </span>
              </div>
            )}

            <motion.div
              className={cn(
                "flex gap-3",
                vertical ? "items-start" : "w-36 flex-col items-start",
                state === "current" && i === highlight && "origin-left",
              )}
              initial={false}
              animate={animate && i === highlight ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, ease: ease.smooth, delay: settleDelay }}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  vertical ? "w-7" : "h-7",
                )}
              >
                <Marker state={state} highlight={i === highlight} />
              </span>
              <div
                className={cn(
                  "min-w-0 rounded-md px-3 py-2",
                  i === highlight
                    ? "border border-jade/30 bg-jade-tint"
                    : cited
                      ? "border border-line-strong/40 bg-surface"
                      : "",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2">
                  <span
                    className={cn(
                      "relative font-mono text-sm font-medium",
                      state === "current" ? "text-ink" : "text-ink-2",
                    )}
                  >
                    {docLabel(n.van_ban.loai, n.van_ban.so_hieu)}
                    <Strike on={struck} delay={settleDelay * 0.6} animate={animate} />
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      state === "current"
                        ? "text-jade"
                        : state === "future"
                          ? "text-ink-3"
                          : "text-crimson",
                    )}
                  >
                    {STATE_WORD[state]}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-sm leading-[1.5] tabular-nums",
                    struck ? "text-ink-3" : "text-ink",
                  )}
                >
                  {n.noi_dung_ngan}
                </p>
                <p className="mt-0.5 font-mono text-xs text-ink-3 tabular-nums">
                  {(from === n.van_ban.hieu_luc_tu
                    ? vi.drawer.effectiveFrom
                    : vi.drawer.appliesFrom
                  ).toLowerCase()}{" "}
                  {formatDate(from)}
                </p>
                {retro && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                    <History aria-hidden className="size-3.5" />
                    {vi.drawer.issuedRetro(formatDate(n.van_ban.ngay_ban_hanh))}
                  </p>
                )}
              </div>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
