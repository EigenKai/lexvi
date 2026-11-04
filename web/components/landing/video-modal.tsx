"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { useRef } from "react";
import { useLocale } from "@/components/providers";
import { duration, ease } from "@/lib/motion";

/** The demo film (self-hosted 720p copy of film/lexvi-film/out/lexvi-film.mp4). */
export const DEMO_VIDEO = "/demo/lexvi-film-720p.mp4";
export const DEMO_POSTER = "/demo/lexvi-film-poster.jpg";

/**
 * "Watch the demo": a Radix Dialog (focus trap, Escape, focus returns to the trigger) with the film.
 */
export function VideoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  // Opened programmatically (two buttons, no Dialog.Trigger): remember what had focus and return it.
  const returnTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.base, ease: ease.smooth }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onCloseAutoFocus={(e) => {
                if (returnTo.current?.isConnected) {
                  e.preventDefault();
                  returnTo.current.focus();
                }
              }}
            >
              <motion.div
                data-film="video-modal"
                className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,1200px,calc((100dvh-8rem)*16/9))] -translate-x-1/2 -translate-y-1/2 outline-none"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: duration.enter, ease: ease.settle }}
              >
                <div className="mb-3 flex items-center justify-between gap-4 text-white">
                  <Dialog.Title className="font-display text-lg font-semibold">
                    {t.landing.videoTitle}
                  </Dialog.Title>
                  <Dialog.Close
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                    aria-label={t.landing.videoClose}
                  >
                    <X aria-hidden className="size-6" />
                  </Dialog.Close>
                </div>
                {/* biome-ignore lint/a11y/useMediaCaption: English captions are burned into the film */}
                <video
                  aria-label={t.landing.videoTitle}
                  className="aspect-video w-full rounded-lg bg-black shadow-[0_30px_80px_rgb(0_0_0/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  src={DEMO_VIDEO}
                  poster={DEMO_POSTER}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
                <p className="mt-2 font-sans text-sm text-white/75">{t.landing.videoNote}</p>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
