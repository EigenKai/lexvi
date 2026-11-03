"use client";

import { FlaskConical, Loader2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ask, getCitationDetail, usingMock } from "@/lib/api/client";
import type { AskResponseMoRong, HoSo, IsoDate } from "@/lib/api/contract";
import { MOCK_SUGGESTIONS } from "@/lib/api/mock";
import { type FilmConfig, readFilmConfig } from "@/lib/film";
import { vi } from "@/lib/i18n/vi";
import { citationStatus, isCitableStatus } from "@/lib/legal-status";
import { presence, presenceReduced } from "@/lib/motion";
import { AnswerCard } from "./answer-card";
import { AppliedDatePicker } from "./applied-date-picker";
import { AskBar } from "./ask-bar";
import type { ResolvedCitation } from "./citation-chip";
import { CitationDrawer } from "./citation-drawer";
import { ProfileChip, ProfileSheet } from "./profile";
import { VerificationRibbon } from "./verification-ribbon";

// MOCK — the persona's profile (CLAUDE.md §3). [ILLUSTRATIVE] revenue figure.
const DEFAULT_PROFILE: HoSo = {
  loai_hinh: "ho_kinh_doanh",
  nganh: "Ăn uống (quán cà phê)",
  doanh_thu_nam: 800_000_000,
  dia_ban: "TP. Hồ Chí Minh",
};

type Phase = "idle" | "searching" | "verifying" | "done" | "error";

interface Result {
  run: number;
  applied: IsoDate;
  response: AskResponseMoRong;
  citations: ResolvedCitation[];
  /**
   * can_xac_nhan, forced true if the answer cites an article that is not in force on the applied
   * date (expired, amended, not yet applicable, or not found in its chain) — DESIGN.md §4.3.
   */
  needsConfirm: boolean;
}

export function AskScreen() {
  const [film] = useState<FilmConfig>(() => readFilmConfig(window.location.search));
  const reduced = useReducedMotion();

  const [applied, setApplied] = useState<IsoDate>(film.initialDate ?? film.today);
  const [hoSo, setHoSo] = useState<HoSo>(DEFAULT_PROFILE);
  const [question, setQuestion] = useState(film.question ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [lastAsked, setLastAsked] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const abort = useRef<AbortController | null>(null);
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
      setOpenId(null);
      setLastAsked(q);
      setPhase("searching");
      try {
        const response = await ask(
          { cau_hoi: q, ngay_ap_dung: date, ho_so: profile },
          { latencyMs: film.latencyMs, scenario: film.scenario, signal: ctrl.signal },
        );
        const citations = await Promise.all(
          response.trich_dan.map(async (trich): Promise<ResolvedCitation> => {
            const detail = await getCitationDetail(trich.id, ctrl.signal);
            return {
              trich,
              detail,
              status: detail ? citationStatus(detail.van_ban.so_hieu, detail.chuoi, date) : null,
            };
          }),
        );
        if (ctrl.signal.aborted) return;
        runCount.current += 1;
        setResult({
          run: runCount.current,
          applied: date,
          response,
          citations,
          needsConfirm: response.can_xac_nhan || citations.some((c) => !isCitableStatus(c.status)),
        });
        setPhase("verifying");
      } catch (err) {
        // Ignore aborts and anything from a run that a newer run has replaced.
        if ((err as Error).name === "AbortError" || abort.current !== ctrl) return;
        setPhase("error");
      }
    },
    [film.latencyMs, film.scenario],
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

  const open = result?.citations.find((c) => c.trich.id === openId) ?? null;
  const variants = reduced ? presenceReduced : presence;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pt-10 pb-16 max-sm:px-4 max-sm:pt-6">
        <header className="flex flex-col gap-2">
          {usingMock && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                data-film="mock-badge"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-2"
              >
                <FlaskConical aria-hidden className="size-3.5" />
                {vi.mockBadge}
              </p>
              <p className="text-xs text-ink-3">{vi.mockNote}</p>
            </div>
          )}
          <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] text-ink max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
            {vi.ask.title}
          </h1>
          <p className="text-ink-2">{vi.ask.subtitle}</p>
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
          />
        </div>
        <div className="-mt-3 max-sm:mt-0">
          <AppliedDatePicker value={applied} today={film.today} onChange={changeDate} />
        </div>

        {phase === "idle" && !result && (
          <section aria-label={vi.ask.suggestions} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink-2">{vi.ask.suggestions}</h2>
            <ul className="flex flex-col gap-2">
              {MOCK_SUGGESTIONS.map((s, i) => (
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
          {phase === "searching" && vi.ask.searching}
          {phase === "error" && vi.ask.error}
          {phase === "done" &&
            result &&
            `${vi.answerReady} ${result.needsConfirm ? vi.status.can_xac_nhan : vi.status.verified}.`}
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
              {vi.ask.searching}
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
              {vi.ask.error}
            </motion.p>
          )}
          {result && (phase === "verifying" || phase === "done") && (
            <motion.div key={`result-${result.run}`} className="flex flex-col gap-4">
              <VerificationRibbon
                attempts={result.response.kiem_chung}
                canXacNhan={result.needsConfirm}
                play
                pace={film.pace}
                onDone={onRibbonDone}
              />
              <AnimatePresence>
                {phase === "done" && (
                  <AnswerCard
                    key="answer"
                    response={{ ...result.response, can_xac_nhan: result.needsConfirm }}
                    citations={result.citations}
                    applied={result.applied}
                    today={film.today}
                    onOpenCitation={setOpenId}
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
        onClose={() => setOpenId(null)}
      />
      <ProfileSheet
        open={profileOpen}
        hoSo={hoSo}
        onClose={() => setProfileOpen(false)}
        onSave={saveProfile}
      />
    </MotionConfig>
  );
}
