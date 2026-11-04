"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useProfile, useT } from "@/components/providers";
import { LiveBanner } from "@/components/shell/live-banner";
import { MockBanner } from "@/components/shell/mock-banner";
import { ApiError, ask } from "@/lib/api/client";
import type { AskResponseMoRong, HoSo, IsoDate, RunMeta } from "@/lib/api/contract";
import { mockSuggestions } from "@/lib/api/mock";
import { type FilmConfig, readFilmConfig } from "@/lib/film";
import { citableInAnswer } from "@/lib/legal-status";
import { presence, presenceReduced } from "@/lib/motion";
import { AnswerCard } from "./answer-card";
import { AppliedDatePicker } from "./applied-date-picker";
import { AskBar } from "./ask-bar";
import type { ResolvedCitation } from "./citation-chip";
import { CitationDrawer } from "./citation-drawer";
import { ProfileChip, ProfileSheet } from "./profile";
import { VerificationRibbon } from "./verification-ribbon";

type Phase = "idle" | "searching" | "verifying" | "done" | "error";

interface Result {
  run: number;
  applied: IsoDate;
  response: AskResponseMoRong;
  citations: ResolvedCitation[];
  meta: RunMeta;
  /**
   * can_xac_nhan, forced true if the answer cites an article that is not in force on the applied
   * date (expired, amended, not yet applicable, or not found in its chain) — DESIGN.md §4.3.
   */
  needsConfirm: boolean;
}

export function AskScreen() {
  const t = useT();
  const { locale } = useLocale();
  const [film] = useState<FilmConfig>(() => readFilmConfig(window.location.search));
  const reduced = useReducedMotion();

  const [applied, setApplied] = useState<IsoDate>(film.initialDate ?? film.today);
  const { hoSo, setHoSo } = useProfile();
  const [question, setQuestion] = useState(film.question ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [lastAsked, setLastAsked] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [errorKind, setErrorKind] = useState<"failed" | "timeout" | "length" | "limit" | "down">(
    "failed",
  );
  const [profileOpen, setProfileOpen] = useState(false);

  const abort = useRef<AbortController | null>(null);
  // Seconds since the request started; the real /ask takes ~30 s, so show progress.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (phase !== "searching") return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);
  const runCount = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Camera-ready mode flag for CSS (no caret, no scrollbars).
  useEffect(() => {
    if (film.enabled) document.documentElement.dataset.filmMode = "";
    return () => {
      delete document.documentElement.dataset.filmMode;
    };
  }, [film.enabled]);

  const run = useCallback(
    async (q: string, date: IsoDate, profile: HoSo) => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setOpenIndex(null);
      setLastAsked(q);
      setErrorKind("failed");
      setPhase("searching");
      try {
        const { response, views, meta } = await ask(
          { cau_hoi: q, ngay_ap_dung: date, ho_so: profile },
          { latencyMs: film.latencyMs, scenario: film.scenario, lang: locale, signal: ctrl.signal },
        );
        // views[i] belongs to trich_dan[i]: one provision may be cited twice with different quotes.
        const citations: ResolvedCitation[] = response.trich_dan.map((trich, i) => {
          const view = views[i] ?? {
            id: trich.id,
            cau_trich: trich.cau_trich,
            trang: trich.trang,
          };
          return { trich, view, status: view.trang_thai ?? null };
        });
        if (ctrl.signal.aborted) return;
        const all = citations.map((c) => c.view);
        runCount.current += 1;
        setResult({
          run: runCount.current,
          applied: date,
          response,
          citations,
          meta,
          // An amended provision cited together with its amender still reads as the rule in force.
          needsConfirm: response.can_xac_nhan || all.some((v) => !citableInAnswer(v, all)),
        });
        setPhase("verifying");
      } catch (err) {
        // A newer run replaced this one: leave its state alone.
        if (abort.current !== ctrl) return;
        const name = (err as Error).name;
        // Aborted (e.g. the screen was left mid-request): don't stay stuck on "searching".
        if (name === "AbortError") {
          setPhase((p) => (p === "searching" ? "idle" : p));
          return;
        }
        setErrorKind(
          name === "TimeoutError"
            ? "timeout"
            : err instanceof ApiError && err.status === 422
              ? "length"
              : err instanceof ApiError && err.status === 429
                ? "limit"
                : err instanceof ApiError && err.status === 503
                  ? "down"
                  : "failed",
        );
        setPhase("error");
      }
    },
    [film.latencyMs, film.scenario, locale],
  );

  const submit = () => {
    const q = question.trim();
    if (q) void run(q, applied, hoSo);
  };

  // Time-aware: changing the applied date or the profile re-asks the last question.
  const changeDate = (d: IsoDate) => {
    setApplied(d);
    if (lastAsked) void run(lastAsked, d, hoSo);
  };
  const saveProfile = (h: HoSo) => {
    setHoSo(h);
    setProfileOpen(false);
    if (lastAsked) void run(lastAsked, applied, h);
  };

  // Film autoplay: submit the prefilled question once.
  // The flag is set when the timer fires (not when it is scheduled), so React's dev-mode
  // double effect run — which clears the first timer — doesn't swallow the autoplay.
  const autoplayed = useRef(false);
  const initial = useRef({ applied, hoSo });
  useEffect(() => {
    if (!film.autoplay || !film.question) return;
    const t = setTimeout(() => {
      if (autoplayed.current) return;
      autoplayed.current = true;
      void run(film.question ?? "", initial.current.applied, initial.current.hoSo);
    }, 800);
    return () => clearTimeout(t);
  }, [film.autoplay, film.question, run]);

  useEffect(() => () => abort.current?.abort(), []);

  const onRibbonDone = useCallback(() => setPhase((p) => (p === "verifying" ? "done" : p)), []);

  const open = openIndex === null ? null : (result?.citations[openIndex] ?? null);
  const errorText =
    errorKind === "timeout"
      ? t.ask.errTimeout
      : errorKind === "length"
        ? t.ask.errLength
        : errorKind === "limit"
          ? t.ask.errLimit
          : errorKind === "down"
            ? t.ask.errDown
            : t.ask.error;
  const variants = reduced ? presenceReduced : presence;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pt-10 pb-16 max-sm:px-4 max-sm:pt-6">
        <header className="flex flex-col gap-2">
          <MockBanner />
          <LiveBanner />
          <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] text-ink max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
            {t.ask.title}
          </h1>
          <p className="text-ink-2">{t.ask.subtitle}</p>
          <div className="mt-1 sm:hidden">
            <ProfileChip
              hoSo={hoSo}
              onEdit={() => setProfileOpen(true)}
              film="profile-chip-mobile"
            />
          </div>
        </header>

        {/* <640: the AskBar moves to the end and sticks above the disclaimer + bottom nav
            (DESIGN.md §8); --app-footer-h is measured by AppShell. */}
        <div className="max-sm:sticky max-sm:bottom-[var(--app-footer-h,0px)] max-sm:z-20 max-sm:order-last max-sm:-mx-4 max-sm:bg-paper/95 max-sm:px-4 max-sm:py-2 max-sm:backdrop-blur">
          <AskBar
            value={question}
            onChange={setQuestion}
            onSubmit={submit}
            busy={phase === "searching"}
            textareaRef={textareaRef}
            profile={<ProfileChip hoSo={hoSo} onEdit={() => setProfileOpen(true)} />}
            canned={film.enabled}
            // A date read from a photo sets the applied date; the drafted question waits in the
            // box for the owner to send, so nothing is re-asked here.
            onApplyDate={setApplied}
          />
        </div>
        <div className="-mt-3 max-sm:mt-0">
          <AppliedDatePicker value={applied} today={film.today} onChange={changeDate} />
        </div>

        {phase === "idle" && !result && (
          <section aria-label={t.ask.suggestions} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink-2">{t.ask.suggestions}</h2>
            <ul className="flex flex-col gap-2">
              {mockSuggestions(locale).map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    data-film={`suggestion-${i}`}
                    onClick={() => {
                      setQuestion(s);
                      void run(s, applied, hoSo);
                    }}
                    className="min-h-11 w-full rounded-md border border-line bg-surface px-4 py-2.5 text-left text-[0.9375rem] leading-[1.5] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div aria-live="polite" className="sr-only">
          {phase === "searching" && t.ask.searching}
          {phase === "error" && errorText}
          {phase === "done" &&
            result &&
            `${t.answerReady} ${result.needsConfirm ? t.status.can_xac_nhan : t.status.verified}.`}
        </div>

        <AnimatePresence mode="wait">
          {phase === "searching" && (
            <motion.p
              key="searching"
              variants={variants}
              initial="hidden"
              animate="shown"
              exit="gone"
              className="flex items-center gap-2 text-sm text-ink-2"
            >
              <Loader2 aria-hidden className="size-4 text-brand motion-safe:animate-spin" />
              {t.ask.searching}
              {elapsed >= 2 && (
                <span className="font-mono text-xs text-ink-3 tabular-nums">
                  {t.ask.elapsed(elapsed)}
                </span>
              )}
            </motion.p>
          )}
          {phase === "error" && (
            <motion.p
              key="error"
              variants={variants}
              initial="hidden"
              animate="shown"
              exit="gone"
              className="text-sm text-crimson"
            >
              {errorText}
            </motion.p>
          )}
          {result && (phase === "verifying" || phase === "done") && (
            <motion.div key={`result-${result.run}`} className="flex flex-col gap-4">
              <VerificationRibbon
                attempts={result.response.kiem_chung}
                canXacNhan={result.needsConfirm}
                unresolved={result.meta.van_de}
                play
                pace={film.pace}
                onDone={onRibbonDone}
              />
              {result.meta.so_luot !== undefined && result.meta.thoi_gian_giay !== undefined && (
                <p data-film="run-meta" className="-mt-2 font-mono text-xs text-ink-3 tabular-nums">
                  {t.ask.runMeta(result.meta.so_luot, Math.round(result.meta.thoi_gian_giay))}
                </p>
              )}
              <AnimatePresence>
                {phase === "done" && (
                  <AnswerCard
                    key="answer"
                    response={{ ...result.response, can_xac_nhan: result.needsConfirm }}
                    citations={result.citations}
                    applied={result.applied}
                    today={film.today}
                    onOpenCitation={setOpenIndex}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CitationDrawer
        citation={open}
        applied={result?.applied ?? applied}
        attempts={result?.response.kiem_chung}
        canXacNhan={result?.needsConfirm ?? false}
        unresolved={result?.meta.van_de}
        onClose={() => setOpenIndex(null)}
      />
      <ProfileSheet
        open={profileOpen}
        hoSo={hoSo}
        onClose={() => setProfileOpen(false)}
        onSave={saveProfile}
      />
    </>
  );
}
