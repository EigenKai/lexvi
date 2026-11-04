"use client";

import { cn } from "cn";
import { CalendarClock, Check, CircleAlert } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/providers";
import type { ChecklistItem, IsoDate } from "@/lib/api/contract";
import { daysBetween, formatDate, isIsoDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { CitationChip, type ResolvedCitation } from "./citation-chip";

function dueText(t: Dict, days: number): string {
  if (days < 0) return t.due.overdue(-days);
  if (days === 0) return t.due.today;
  return t.due.left(days);
}

/** DESIGN.md §4.8 — overdue crimson, ≤ 7 days amber, each with an icon and words. */
export function Checklist({
  items,
  today,
  citations = [],
  onOpenCitation,
  emptyText,
  film = "checklist",
}: {
  items: ChecklistItem[];
  today: IsoDate;
  /** Citations to show as chips for `can_cu`; when none matches, `can_cu` shows as a mono label. */
  citations?: ResolvedCitation[];
  /** Opens the citation at this index of `citations`. */
  onOpenCitation?: (index: number) => void;
  emptyText?: string;
  film?: string;
}) {
  const t = useT();
  const [done, setDone] = useState<Record<number, boolean>>({});

  if (items.length === 0)
    return <p className="text-sm text-ink-3">{emptyText ?? t.answer.noChecklist}</p>;

  return (
    <ul data-film={film} className="flex flex-col divide-y divide-line">
      {items.map((item, i) => {
        // The backend sends han: "" when the law states no deadline.
        const hasDue = isIsoDate(item.han.slice(0, 10));
        const days = hasDue ? daysBetween(today, item.han) : 0;
        const tone = !hasDue ? "none" : days < 0 ? "overdue" : days <= 7 ? "soon" : "later";
        const basisIndex = citations.findIndex((c) => c.trich.id === item.can_cu);
        const basis = basisIndex >= 0 ? citations[basisIndex] : undefined;
        const id = `task-${i}`;
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: two tasks may share text and deadline
            key={`${item.viec}|${item.han}|${i}`}
            className="flex gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="relative mt-0.5 inline-flex size-6 shrink-0">
              <input
                id={id}
                type="checkbox"
                checked={!!done[i]}
                onChange={(e) => setDone((d) => ({ ...d, [i]: e.target.checked }))}
                className="peer absolute -inset-2.5 size-11 cursor-pointer opacity-0"
                aria-describedby={`${id}-due`}
              />
              <span
                aria-hidden
                className="pointer-events-none inline-flex size-6 items-center justify-center rounded-sm border-[1.5px] border-line-strong bg-surface text-white transition-colors peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
              >
                {done[i] && <Check className="size-4" />}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <label
                htmlFor={id}
                className={cn(
                  "block cursor-pointer text-[0.9375rem] leading-[1.5]",
                  done[i] ? "text-ink-3 line-through" : "text-ink",
                )}
              >
                {item.viec}
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  id={`${id}-due`}
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                    tone === "overdue" && "text-crimson",
                    tone === "soon" && "text-amber",
                    (tone === "later" || tone === "none") && "text-ink-2",
                  )}
                >
                  {tone === "later" || tone === "none" ? (
                    <CalendarClock aria-hidden className="size-4" />
                  ) : (
                    <CircleAlert aria-hidden className="size-4" />
                  )}
                  {hasDue ? `${dueText(t, days)} · ${formatDate(item.han)}` : t.due.noDeadline}
                </span>
                {!basis && item.can_cu && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-ink-3">
                    {t.due.basis}
                    <span className="truncate font-mono text-ink-2">{item.can_cu}</span>
                  </span>
                )}
                {basis && onOpenCitation && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-ink-3">
                    {t.due.basis}
                    <CitationChip
                      size="sm"
                      citation={basis}
                      onOpen={() => onOpenCitation(basisIndex)}
                    />
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
