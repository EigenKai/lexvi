"use client";

import { cn } from "cn";
import { ArrowRight, Play } from "lucide-react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { useLocale } from "@/components/providers";
import { isLiveBuild, LIVE_SITE } from "@/lib/api/sites";
import { ease } from "@/lib/motion";

/** Where "Try the demo" goes: the Ask screen on this site. */
export const TRY_HREF = "/hoi-dap";

const btn =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-md px-6 font-sans text-[0.9375rem] font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function WatchButton({
  onClick,
  className,
  film = "landing-watch",
}: {
  onClick: () => void;
  className?: string;
  film?: string;
}) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      data-film={film}
      className={cn(
        btn,
        "bg-brand text-white shadow-[0_8px_22px_rgb(29_58_138/0.28)] hover:bg-[#17306f]",
        className,
      )}
    >
      <Play aria-hidden className="size-4 fill-current" />
      {t.landing.watch}
    </button>
  );
}

export function TryButton({
  className,
  compact = false,
  film = "landing-try",
}: {
  className?: string;
  compact?: boolean;
  film?: string;
}) {
  const { t } = useLocale();
  return (
    <Link
      href={TRY_HREF}
      data-film={film}
      className={cn(
        btn,
        "border border-ink/80 bg-surface/90 text-ink hover:bg-surface",
        compact && "min-h-11 px-4 text-sm",
        className,
      )}
    >
      {t.landing.try}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

/** Prepared site only: a quiet link to the same screen on the live copy of the app. */
export function TryLiveLink({
  className,
  film = "landing-try-live",
}: {
  className?: string;
  film?: string;
}) {
  const { t } = useLocale();
  if (isLiveBuild || !LIVE_SITE) return null;
  return (
    <a
      href={`${LIVE_SITE}${TRY_HREF}`}
      data-film={film}
      className={cn(
        "relative inline-flex min-h-11 items-center rounded-md bg-surface/85 px-2.5 font-sans text-sm font-medium text-brand underline-offset-4 hover:underline",
        className,
      )}
    >
      {t.landing.tryLive}
    </a>
  );
}

/** The brand mark (same drawing as the app rail). */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="26" height="26" rx="7" className="fill-brand" />
      <path
        d="M8 8.5h8M8 12.5h12M8 16.5h6"
        stroke="#FAF8F3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15.5 19.2l2.3 2.3 4.4-4.6"
        stroke="#3DD6A3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** "Built on …" pill: Meta's models, named where they are really used. */
export function MetaPill({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 border-brand bg-surface px-4 py-1.5 font-sans text-sm font-bold text-brand",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** KineticLine (DESIGN.md §10.2): words rise into focus one by one. Static under reduced motion. */
export function KineticLine({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  if (reduced) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: words can repeat; order is the identity
          key={`${w}-${i}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: "0.4em", filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          transition={{
            type: "spring",
            stiffness: 140,
            damping: 30,
            mass: 0.8,
            delay: delay + i * 0.1,
          }}
        >
          {i < words.length - 1 ? `${w} ` : w}
        </motion.span>
      ))}
    </span>
  );
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** One digit column of the Odometer: rolls to its value on a spring (DESIGN.md §10.2). */
function Digit({ d, reduced }: { d: number; reduced: boolean | null }) {
  const spring = useSpring(d, { stiffness: 140, damping: 30, mass: 0.8 });
  useEffect(() => {
    if (reduced) spring.jump(d);
    else spring.set(d);
  }, [d, reduced, spring]);
  const y = useTransform(spring, (v) => `${-v}em`);
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline leading-none">
      <motion.span className="absolute left-0 top-0 flex flex-col" style={{ y }}>
        {DIGITS.map((n) => (
          <span key={n} className="block h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Odometer numerals: each digit rolls; separators stay put. `value` is the formatted string. */
export function Odometer({ value, className }: { value: string; className?: string }) {
  const reduced = useReducedMotion();
  const chars = value.split("");
  return (
    <span className={cn("inline-flex items-baseline tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {chars.map((c, i) =>
          /\d/.test(c) ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: digit columns are positional
            <Digit key={`d${chars.length - i}`} d={Number(c)} reduced={reduced} />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: separators are positional
            <span key={`s${chars.length - i}`} className="leading-none">
              {c}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

/** The footer line under a stage: sources and honesty notes, never a text column. */
export function FooterNote({ children, className }: { children: string; className?: string }) {
  return (
    <motion.p
      key={children}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: ease.smooth }}
      className={cn(
        "relative z-10 border-t border-line bg-paper/95 px-4 py-2 text-center font-sans text-xs leading-[1.5] text-ink-2 sm:text-[0.8125rem]",
        className,
      )}
    >
      {children}
    </motion.p>
  );
}

/** Film-style caption: narrator in an ink box; Minh in italic on paper. */
export function Caption({ text, minh = false }: { text: string; minh?: boolean }) {
  return (
    <motion.p
      key={text}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: ease.settle }}
      className={cn(
        "mx-auto max-w-[min(92vw,62rem)] rounded-[10px] px-4 py-2 text-center font-sans text-[0.9375rem] leading-[1.5] sm:text-lg",
        minh ? "border-2 border-[#C9A57A] bg-paper text-[#4A2E14] italic" : "bg-ink/90 text-white",
      )}
    >
      {text}
    </motion.p>
  );
}
