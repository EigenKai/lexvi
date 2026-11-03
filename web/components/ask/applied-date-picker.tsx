"use client";

import { cn } from "cn";
import { CalendarDays } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { IsoDate } from "@/lib/api/contract";
import { formatDate } from "@/lib/format";
import { vi } from "@/lib/i18n/vi";

/** Dates worth trying in the demo: before the 2026 change, and inside the retroactive window. */
const PRESETS: IsoDate[] = ["2025-12-01", "2026-03-15"];

/**
 * DESIGN.md §4.1 "Áp dụng tại ngày" — the product's key idea, always visible.
 * Shows dd/MM/yyyy regardless of the browser locale (the native field would follow the capture
 * machine's locale on camera); the native picker opens via showPicker().
 */
export function AppliedDatePicker({
  value,
  today,
  onChange,
}: {
  value: IsoDate;
  today: IsoDate;
  onChange: (iso: IsoDate) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // Browsers without showPicker(): show the native field itself instead of the button.
  const [native, setNative] = useState(false);

  const open = () => {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      setNative(true);
      requestAnimationFrame(() => input.current?.focus());
    }
  };

  return (
    <div data-film="applied-date" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id={`${id}-label`} className="text-sm font-semibold text-ink">
        {vi.appliedDate.label}
      </span>
      <div className="relative">
        <button
          hidden={native}
          type="button"
          onClick={open}
          aria-label={`${vi.appliedDate.change}: ${formatDate(value)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 font-mono text-[0.9375rem] font-medium text-ink tabular-nums transition-colors hover:bg-surface-sunk"
        >
          <CalendarDays aria-hidden className="size-4 text-brand" />
          {formatDate(value)}
          {value === today && (
            <span className="font-sans text-xs font-medium text-ink-3">
              ({vi.appliedDate.today})
            </span>
          )}
        </button>
        <input
          ref={input}
          id={id}
          type="date"
          value={value}
          max="2099-12-31"
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-labelledby={`${id}-label`}
          // Hidden from assistive tech while the button stands in for it.
          aria-hidden={!native}
          tabIndex={native ? 0 : -1}
          className={
            native
              ? "min-h-11 rounded-md border border-line-strong bg-surface px-3 font-mono text-[0.9375rem] text-ink"
              : "pointer-events-none absolute inset-0 h-full w-full opacity-0"
          }
        />
      </div>
      <span className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
        {vi.appliedDate.tryOther}
        {[today, ...PRESETS.filter((p) => p !== today)].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={value === d}
            className={cn(
              "min-h-11 rounded-md px-2 font-mono text-sm tabular-nums underline-offset-4 transition-colors",
              value === d ? "text-brand underline" : "text-ink-2 hover:text-ink hover:underline",
            )}
          >
            {d === today ? vi.appliedDate.today : formatDate(d)}
          </button>
        ))}
      </span>
    </div>
  );
}
