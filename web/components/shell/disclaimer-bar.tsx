import { FlaskConical, Info } from "lucide-react";
import { usingMock } from "@/lib/api/client";
import { vi } from "@/lib/i18n/vi";

/**
 * DESIGN.md §4.13 — persistent, every app screen, not dismissible.
 * While the app runs on mocks it also carries a "Dữ liệu minh hoạ" flag, so mock output is
 * marked in every frame of a recording, not only at the top of the page (constraints.md).
 */
export function DisclaimerBar() {
  return (
    <div
      data-film="disclaimer"
      role="note"
      className="flex items-start gap-2 border-t border-line bg-surface-sunk px-4 py-2 text-[0.8125rem] leading-[1.5] text-ink-2 lg:justify-center lg:px-8"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
      <p>
        <span className="max-sm:hidden">{vi.disclaimer.vi}</span>
        <span className="sm:hidden">{vi.disclaimer.short}</span>
        {usingMock && (
          <span
            data-film="mock-flag"
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2 align-middle text-xs font-medium whitespace-nowrap"
          >
            <FlaskConical aria-hidden className="size-3" />
            {vi.mockFlag}
          </span>
        )}
      </p>
    </div>
  );
}
