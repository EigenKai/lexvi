"use client";

import { FlaskConical } from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/providers";
import { usingMock } from "@/lib/api/client";
import { LIVE_SITE } from "@/lib/api/sites";

/**
 * Visible whenever the app runs on mock data (constraints.md: never present mocks as live). When a
 * live copy of the app exists, it links to the same screen there.
 */
export function MockBanner() {
  const t = useT();
  const path = usePathname();
  if (!usingMock) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p
        data-film="mock-badge"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-2"
      >
        <FlaskConical aria-hidden className="size-3.5" />
        {t.mockBadge}
      </p>
      <p className="text-xs text-ink-3">{t.mockNote}</p>
      {LIVE_SITE && (
        <a
          href={`${LIVE_SITE}${path}`}
          data-film="mock-to-live"
          className="inline-flex min-h-11 items-center text-xs font-medium text-brand underline-offset-2 hover:underline"
        >
          {t.live.tryLive}
        </a>
      )}
    </div>
  );
}
