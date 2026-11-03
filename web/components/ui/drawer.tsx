"use client";

import { cn } from "cn";
import { Info, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { useT } from "@/components/providers";
import { duration, ease } from "@/lib/motion";
import { useIsDesktop } from "@/lib/use-media-query";

/**
 * Right drawer (≥1024, 480 px) / bottom sheet (<1024, 90 vh). Radix Dialog gives focus trap,
 * Escape and aria wiring; Motion gives the house drawer move (DESIGN.md §10.3: x 100%→0, settle,
 * 320 ms; scrim fades; reduced motion → fade).
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  film,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  film?: string;
}) {
  const t = useT();
  const desktop = useIsDesktop();
  const reduced = useReducedMotion();
  // Opened programmatically (no Dialog.Trigger), so remember what had focus and return it on close.
  // Captured during the render that opens it: child effects (Radix's focus trap) run before ours.
  const returnTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;

  const from = reduced ? { opacity: 0 } : desktop ? { x: "100%" } : { y: "100%" };
  const to = reduced ? { opacity: 1 } : desktop ? { x: 0 } : { y: 0 };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.base, ease: ease.smooth }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              onCloseAutoFocus={(e) => {
                if (returnTo.current?.isConnected) {
                  e.preventDefault();
                  returnTo.current.focus();
                }
              }}
            >
              <motion.div
                data-film={film}
                className={cn(
                  "fixed z-50 flex flex-col bg-surface shadow-overlay outline-none",
                  desktop
                    ? "inset-y-0 right-0 w-[480px] max-w-full border-l border-line"
                    : "inset-x-0 bottom-0 h-[90dvh] rounded-t-lg border-t border-line",
                )}
                initial={from}
                animate={to}
                exit={{
                  ...from,
                  transition: { duration: duration.base, ease: ease.exit },
                }}
                transition={{ duration: duration.base, ease: ease.settle }}
              >
                {!desktop && (
                  <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
                )}
                <div className="flex items-start gap-3 border-b border-line px-6 pt-5 pb-4 max-sm:px-4">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="font-display text-[1.375rem] leading-[1.35] font-semibold text-ink">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-ink-3">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-sunk"
                    aria-label={t.drawer.close}
                  >
                    <X aria-hidden className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
                  {children}
                </div>
                {/* The drawer covers the page's DisclaimerBar, so it repeats the short form. */}
                <p className="flex items-start gap-2 border-t border-line bg-surface-sunk px-6 py-2 text-xs text-ink-2 max-sm:px-4">
                  <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                  {t.disclaimer.short}
                </p>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
