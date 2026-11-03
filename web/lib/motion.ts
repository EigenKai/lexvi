import type { Transition, Variants } from "motion/react";

/**
 * House motion tokens (DESIGN.md §10). Same curves as Pyrium `motion/theme.ts` and the Ignis film.
 * Presence values are ported from Pyrium/Ignis `time.ts → presence()`.
 */
export const ease = {
  settle: [0.16, 1, 0.3, 1],
  smooth: [0.45, 0, 0.2, 1],
  exit: [0.7, 0, 0.84, 0],
  ui: [0.23, 1, 0.32, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/** Seconds. */
export const duration = {
  press: 0.12,
  ui: 0.22,
  base: 0.32,
  enter: 0.55,
  exit: 0.45,
  draw: 0.7,
  reveal: 0.8,
} as const;

/** Overdamped, never bouncy. */
export const spring: Transition = { type: "spring", damping: 30, stiffness: 140, mass: 0.8 };

/** Presence: opacity + blur + rise. Leave: fade, blur up, lift. */
export const presence: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 22 },
  shown: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: duration.enter, ease: ease.settle },
    // Drop the filter once settled: a lingering blur(0px) keeps the element on its own GPU
    // layer, which costs memory and makes anti-aliasing vary between otherwise identical takes.
    transitionEnd: { filter: "none" },
  },
  gone: {
    opacity: 0,
    filter: "blur(12px)",
    y: -12,
    transition: { duration: duration.exit, ease: ease.exit },
  },
};

/** Reduced-motion presence: opacity only, 140 ms (DESIGN.md §10.3). */
export const presenceReduced: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.14 } },
  gone: { opacity: 0, transition: { duration: 0.14 } },
};
