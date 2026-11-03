"use client";

import { cn } from "cn";
import { CornerDownLeft, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/providers";
import type { LanKiemChung, MaKiemChung } from "@/lib/api/contract";
import type { Dict } from "@/lib/i18n";
import { duration, ease } from "@/lib/motion";

export const MAX_ATTEMPTS = 3;
const ORDER: MaKiemChung[] = ["ton_tai", "con_hieu_luc", "khop_nguyen_van", "mo_hinh_danh_gia"];

/** DESIGN.md §10.3: checks resolve 180 ms apart. `pace` slows it for the camera (?pace=2). */
const STEP_MS = 180;
const RETRY_PAUSE_MS = 1100;

type StepView = "pending" | "running" | "pass" | "fail" | "skipped";

interface Frame {
  attempt: number; // index into attempts
  revealed: number; // steps resolved in this attempt
}

/** All frames of the replay, in order. */
function buildFrames(attempts: LanKiemChung[]): Frame[] {
  const frames: Frame[] = [];
  attempts.forEach((a, i) => {
    for (let r = 0; r <= a.buoc.length; r++) frames.push({ attempt: i, revealed: r });
  });
  return frames;
}

/**
 * View of each check in ORDER, given how many entries of `buoc` (in the order the server sent
 * them) have resolved. Works even if the server skips a check or sends them out of order.
 */
function stepViews(a: LanKiemChung, revealed: number): StepView[] {
  const resolved = new Map(a.buoc.slice(0, revealed).map((b) => [b.ma, b.dat]));
  const running = a.buoc[revealed]?.ma;
  const attemptOver = revealed >= a.buoc.length;
  return ORDER.map((ma) => {
    const dat = resolved.get(ma);
    if (dat !== undefined) return dat ? "pass" : "fail";
    if (ma === running) return "running";
    const sent = a.buoc.some((b) => b.ma === ma);
    return !sent && attemptOver ? "skipped" : "pending";
  });
}

function DrawnMark({ kind, animate }: { kind: "pass" | "fail"; animate: boolean }) {
  const d = kind === "pass" ? "M6 10.5l2.6 2.6L14 7.5" : "M7 7l6 6M13 7l-6 6";
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full",
        kind === "pass" ? "bg-jade" : "bg-crimson",
      )}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <motion.path
          d={d}
          fill="none"
          className="stroke-white"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.32, ease: ease.smooth }}
        />
      </svg>
    </span>
  );
}

function StepIcon({ view, animate }: { view: StepView; animate: boolean }) {
  switch (view) {
    case "pass":
    case "fail":
      return <DrawnMark kind={view} animate={animate} />;
    case "running":
      return <Loader2 aria-hidden className="size-5 text-brand motion-safe:animate-spin" />;
    case "skipped":
      return (
        <span
          aria-hidden
          className="inline-block size-5 rounded-full border-[1.5px] border-dashed border-line-strong"
        />
      );
    default:
      return (
        <span aria-hidden className="inline-block size-5 rounded-full border-[1.5px] border-line" />
      );
  }
}

function viewWord(t: Dict, v: StepView): string {
  return {
    pending: "",
    running: t.verify.running,
    pass: t.verify.passed,
    fail: t.verify.failed,
    skipped: t.verify.skipped,
  }[v];
}

function UnresolvedList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-2 w-full basis-full text-sm">
      <p className="font-medium text-ink-2">{title}</p>
      <ul lang="vi" className="mt-1 list-disc pl-5 text-ink-2">
        {items.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

export function VerificationRibbon({
  attempts,
  canXacNhan,
  play,
  pace = 1,
  onDone,
  className,
  filmPrefix = "",
  unresolved,
  heading: Heading = "h2",
}: {
  attempts: LanKiemChung[] | undefined;
  /** The answer needs confirmation (server flag, or a cited article not in force). */
  canXacNhan: boolean;
  /** Replay the attempts step by step. False → final state immediately. */
  play: boolean;
  pace?: number;
  onDone?: () => void;
  className?: string;
  /** Prefix for data-film hooks, so a second ribbon (in the drawer) doesn't duplicate them. */
  filmPrefix?: string;
  /** Problems left after the last refusal (backend van_de_chua_giai_quyet), shown when not passed. */
  unresolved?: string[];
  heading?: "h2" | "h3";
}) {
  const t = useT();
  const [scope, animateScope] = useAnimate<HTMLElement>();
  const reduced = useReducedMotion();
  const frames = useMemo(() => (attempts ? buildFrames(attempts) : []), [attempts]);
  const animate = play && !reduced && frames.length > 0;
  const [index, setIndex] = useState(animate ? 0 : Math.max(frames.length - 1, 0));
  // Latest callback without restarting the replay when the parent re-renders.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const done = () => doneRef.current?.();
    if (!animate) {
      setIndex(Math.max(frames.length - 1, 0));
      done();
      return;
    }
    setIndex(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const lastAttempt = frames[frames.length - 1].attempt;
    // After a failed attempt, hold so the reason can be read before the retry starts.
    const delayAfter = (f: Frame) =>
      attempts && f.revealed === attempts[f.attempt].buoc.length && f.attempt < lastAttempt
        ? RETRY_PAUSE_MS
        : STEP_MS;
    const tick = () => {
      if (i >= frames.length - 1) {
        done();
        return;
      }
      timer = setTimeout(() => {
        i += 1;
        setIndex(i);
        tick();
      }, delayAfter(frames[i]) * pace);
    };
    tick();
    return () => clearTimeout(timer);
  }, [animate, frames, pace, attempts]);

  // Retry: shake once ±4 px when a new attempt starts (reduced motion: no shake). Done with an
  // imperative animation so the section is not remounted (which would reset the counter).
  const attemptIndex = frames[Math.min(index, frames.length - 1)]?.attempt ?? 0;
  useEffect(() => {
    if (!animate || attemptIndex === 0 || !scope.current) return;
    animateScope(scope.current, { x: [0, -4, 4, -4, 0] }, { duration: duration.ui, ease: ease.ui });
  }, [animate, attemptIndex, animateScope, scope]);

  // Backend did not send the proposed `kiem_chung` field → final state only.
  if (!attempts || attempts.length === 0) {
    return (
      <section
        data-film={`${filmPrefix}verification-ribbon`}
        aria-label={t.verify.title}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm",
          canXacNhan
            ? "border-amber/30 bg-amber-tint text-amber"
            : "border-jade/30 bg-jade-tint text-jade",
          className,
        )}
      >
        {canXacNhan ? (
          <TriangleAlert aria-hidden className="size-4" />
        ) : (
          <ShieldCheck aria-hidden className="size-4" />
        )}
        <span className="font-medium">
          {canXacNhan ? t.status.can_xac_nhan : t.status.verified}
        </span>
        <span className="text-ink-3">· {t.verify.finalOnly}</span>
        {canXacNhan && unresolved && unresolved.length > 0 && (
          <UnresolvedList items={unresolved} title={t.verify.unresolved} />
        )}
      </section>
    );
  }

  const frame = frames[Math.min(index, frames.length - 1)];
  const current = attempts[frame.attempt];
  const isLast = index >= frames.length - 1;
  const views = stepViews(current, frame.revealed);
  const failed = current.buoc.find((b) => !b.dat);
  const attemptDone = frame.revealed >= current.buoc.length;
  // Final state comes from the last attempt itself; a separate note covers the case where all
  // checks passed but the answer still needs confirmation (e.g. a cited article not in force).
  const finalFail = isLast && !!failed;
  const finalPass = isLast && !failed;
  const passButFlagged = finalPass && canXacNhan;

  return (
    <section
      ref={scope}
      data-film={`${filmPrefix}verification-ribbon`}
      aria-label={t.verify.title}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-surface shadow-card",
        finalFail || passButFlagged ? "border-amber/40" : "border-line",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5">
        <ShieldCheck aria-hidden className="size-4 text-brand" />
        <Heading className="text-sm font-semibold text-ink">{t.verify.title}</Heading>
        <span
          data-film={`${filmPrefix}attempt-counter`}
          className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-xs font-medium text-ink-2 tabular-nums"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={current.lan_thu}
              initial={animate ? { y: 8, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: duration.ui, ease: ease.ui }}
            >
              {t.verify.attempt(current.lan_thu, MAX_ATTEMPTS)}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <ol className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 pt-3 pb-3 min-[480px]:grid-cols-2 sm:px-5 xl:grid-cols-4">
        {ORDER.map((ma, i) => (
          <li
            key={ma}
            data-film={`${filmPrefix}check-${ma}`}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-md text-sm",
              views[i] === "skipped" || views[i] === "pending" ? "text-ink-3" : "text-ink",
            )}
          >
            <StepIcon view={views[i]} animate={animate} />
            <span className="leading-normal">
              {t.verify.steps[ma]}
              {viewWord(t, views[i]) && <span className="sr-only"> — {viewWord(t, views[i])}</span>}
            </span>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="px-4 pb-3 sm:px-5">
        {attemptDone && failed && (
          <p className="flex items-start gap-2 text-sm leading-[1.5] text-crimson">
            <CornerDownLeft aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-medium">{t.verify.reason}:</span> {failed.ly_do}{" "}
              {!isLast && <span className="text-ink-3">({t.verify.sentBack})</span>}
            </span>
          </p>
        )}
        {finalPass && !passButFlagged && (
          <p className="text-sm font-medium leading-[1.5] text-jade">{t.verify.allPassed}</p>
        )}
        {(finalFail || passButFlagged) && (
          <p className="mt-2 flex items-center gap-2 rounded-md bg-amber-tint px-3 py-2 text-sm font-medium text-amber">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            {passButFlagged
              ? t.verify.statusNeedsConfirm
              : attempts.length >= MAX_ATTEMPTS
                ? t.verify.gaveUp
                : t.verify.notPassed}
          </p>
        )}
        {finalFail && unresolved && unresolved.length > 0 && (
          <UnresolvedList items={unresolved} title={t.verify.unresolved} />
        )}
      </div>

      {/* Final pass: a faint gold hairline sweeps under the ribbon (decorative). */}
      {finalPass && !passButFlagged && (
        <motion.span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-gold"
          initial={animate ? { scaleX: 0, opacity: 0.9 } : { scaleX: 1, opacity: 0.6 }}
          animate={{ scaleX: 1, opacity: 0.6 }}
          transition={{ duration: duration.reveal, ease: ease.smooth }}
        />
      )}
    </section>
  );
}
