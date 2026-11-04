"use client";

import { FlaskConical, Info } from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/providers";
import { usingMock } from "@/lib/api/client";

/** Screens whose content never comes from the mock (the benchmark shows real eval results). */
const REAL_DATA_ROUTES = ["/kiem-thu", "/ho-so"];

/**
 * DESIGN.md §4.13 — persistent, every app screen, not dismissible.
 * While the app runs on mocks it also carries a "prepared example" flag on the screens that show
 * mock answers, so mock output is marked in every frame of a recording (constraints.md).
 */
export function DisclaimerBar() {
  const t = useT();
  const path = usePathname();
  const showMockFlag = usingMock && !REAL_DATA_ROUTES.includes(path);
  return (
    <div
      data-film="disclaimer"
      role="note"
      className="flex items-start gap-2 border-t border-line bg-surface-sunk px-4 py-2 text-[0.8125rem] leading-[1.5] text-ink-2 lg:justify-center lg:px-8"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
      <p>
        <span className="max-sm:hidden">{t.disclaimer.full}</span>
        <span className="sm:hidden">{t.disclaimer.short}</span>
        {showMockFlag && (
          <span
            data-film="mock-flag"
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2 align-middle text-xs font-medium whitespace-nowrap"
          >
            <FlaskConical aria-hidden className="size-3" />
            {t.mockFlag}
          </span>
        )}
      </p>
    </div>
  );
}
