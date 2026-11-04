"use client";

import { Activity } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useT } from "@/components/providers";
import {
  type BackendState,
  backendState,
  subscribeBackend,
  usingMock,
  wakeBackend,
} from "@/lib/api/client";
import { PREPARED_SITE } from "@/lib/api/sites";

const serverState = (): BackendState => "idle";

/**
 * Live site only: says answers come from Muse Spark in real time, wakes the backend as soon as the
 * screen opens (it may be asleep on free hosting), and links to the prepared copy of the same screen.
 */
export function LiveBanner() {
  const t = useT();
  const path = usePathname();
  const state = useSyncExternalStore(subscribeBackend, backendState, serverState);
  useEffect(() => {
    if (!usingMock) void wakeBackend();
  }, []);
  if (usingMock) return null;
  const status =
    state === "ready"
      ? t.live.ready
      : state === "down"
        ? t.live.down
        : state === "waking"
          ? t.live.waking
          : t.live.checking;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p
        data-film="live-badge"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-jade/40 bg-jade-tint px-2.5 py-0.5 text-xs font-medium text-ink"
      >
        <Activity aria-hidden className="size-3.5 text-jade" />
        {t.live.badge}
      </p>
      <p className="text-xs text-ink-3" role="status" aria-live="polite">
        {status}
      </p>
      {PREPARED_SITE && (
        <a
          href={`${PREPARED_SITE}${path}`}
          data-film="live-to-prepared"
          className="inline-flex min-h-11 items-center text-xs font-medium text-brand underline-offset-2 hover:underline"
        >
          {t.live.toPrepared}
        </a>
      )}
    </div>
  );
}
