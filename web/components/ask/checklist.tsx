"use client";

import { cn } from "cn";
import { CalendarClock, Check, CircleAlert } from "lucide-react";
import { useState } from "react";
import type { ChecklistItem, IsoDate } from "@/lib/api/contract";
import { daysBetween, formatDate } from "@/lib/format";
import { vi } from "@/lib/i18n/vi";
import { CitationChip, type ResolvedCitation } from "./citation-chip";

function dueText(days: number): string {
  if (days < 0) return vi.due.overdue(-days);
  if (days === 0) return vi.due.today;
  return vi.due.left(days);
}

/** DESIGN.md §4.8 — overdue crimson, ≤ 7 days amber, each with an icon and words. */
export function Checklist({
  items,
  today,
  citations,
  onOpenCitation,
}: {
  items: ChecklistItem[];
  today: IsoDate;
  citations: ResolvedCitation[];
  onOpenCitation: (id: string) => void;
}) {
  const [done, setDone] = useState<Record<number, boolean>>({});

  if (items.length === 0) return <p className="text-sm text-ink-3">{vi.answer.noChecklist}</p>;

  return (
    <ul data-film="checklist" className="flex flex-col divide-y divide-line">
      {items.map((item, i) => {
        const days = daysBetween(today, item.han);
        const tone = days < 0 ? "overdue" : days <= 7 ? "soon" : "later";
        const basis = citations.find((c) => c.trich.id === item.can_cu);
        const id = `task-${i}`;
        return (
          <li key={`${item.viec}-${item.han}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
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
                    tone === "later" && "text-ink-2",
                  )}
                >
                  {tone === "later" ? (
                    <CalendarClock aria-hidden className="size-4" />
                  ) : (
                    <CircleAlert aria-hidden className="size-4" />
                  )}
                  {dueText(days)} · {formatDate(item.han)}
                </span>
                {basis && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-ink-3">
                    {vi.due.basis}
                    <CitationChip
                      size="sm"
                      citation={basis}
                      onOpen={() => onOpenCitation(basis.trich.id)}
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
