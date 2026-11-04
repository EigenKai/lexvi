"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useProfile, useT } from "@/components/providers";
import { MockBanner } from "@/components/shell/mock-banner";
import { ApiError, ingest } from "@/lib/api/client";
import type { HoSo, IngestResponse } from "@/lib/api/contract";
import { type FilmConfig, readFilmConfig } from "@/lib/film";
import { presence, presenceReduced } from "@/lib/motion";
import { ProfileChip, ProfileSheet } from "../ask/profile";
import { DropZone, Scanning } from "./drop-zone";
import { ImpactAlert } from "./impact-alert";

type Phase = "idle" | "scanning" | "done" | "error";

/** Decree 141/2026 (official PDF), copied into public/demo for the sample and the film. */
const SAMPLE_PDF = "/demo/van-ban-moi-141-2026.pdf";
const SAMPLE_NAME = "van-ban-moi-141-2026.pdf";

/** "Văn bản mới ảnh hưởng tới bạn" — the /ingest flow (DESIGN.md §11.2). */
export function ImpactScreen() {
  const t = useT();
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  const [film] = useState<FilmConfig>(() => readFilmConfig(window.location.search));
  const { hoSo, setHoSo } = useProfile();

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  // The last input, so a profile change can re-run the same document.
  const last = useRef<{ file: File | null } | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (film.enabled) document.documentElement.dataset.filmMode = "";
    return () => {
      delete document.documentElement.dataset.filmMode;
    };
  }, [film.enabled]);

  const run = useCallback(
    async (file: File | null, profile: HoSo) => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      last.current = { file };
      setFileName(file?.name ?? t.impact.sampleName);
      setError(null);
      setPhase("scanning");
      try {
        // Mock reads take longer than /ask so the scan is visible (the real call takes ~45 s).
        const res = await ingest(file, profile, {
          latencyMs: film.latencyMs * 2.5,
          signal: ctrl.signal,
          lang: locale,
        });
        if (ctrl.signal.aborted) return;
        setResult(res);
        setPhase("done");
      } catch (err) {
        // A newer run replaced this one: leave its state alone.
        if (abort.current !== ctrl) return;
        // Aborted (e.g. the screen was left mid-read): don't stay stuck on "scanning".
        if ((err as Error).name === "AbortError") {
          setPhase((p) => (p === "scanning" ? "idle" : p));
          return;
        }
        // Map codes to copy; the server's own wording only goes to the console (client.ts).
        setError(
          err instanceof ApiError && err.code === "needs-file"
            ? t.impact.errNeedFile
            : err instanceof ApiError && err.status === 413
              ? t.impact.errTooBig
              : err instanceof ApiError && err.status === 422
                ? t.impact.errScanned
                : err instanceof ApiError && err.status === 400
                  ? t.impact.errBadPdf
                  : t.impact.errFailed,
        );
        setPhase("error");
      }
    },
    [film.latencyMs, locale, t],
  );

  /** The sample: Decree 141/2026 from public/demo, sent as a real PDF in both modes. */
  const runSample = useCallback(
    async (profile: HoSo) => {
      let file: File | null = null;
      try {
        const res = await fetch(SAMPLE_PDF);
        if (!res.ok) throw new Error(String(res.status));
        file = new File([await res.blob()], SAMPLE_NAME, { type: "application/pdf" });
      } catch {
        // Mock mode can run without the file; the real backend gets a "needs a PDF" message.
        file = null;
      }
      await run(file, profile);
    },
    [run],
  );

  const reset = () => {
    abort.current?.abort();
    last.current = null;
    setResult(null);
    setError(null);
    setPhase("idle");
  };

  const saveProfile = (h: HoSo) => {
    setHoSo(h);
    setProfileOpen(false);
    if (last.current) void run(last.current.file, h);
  };

  // Film autoplay: run the sample once (flag set when the timer fires; see AskScreen).
  const autoplayed = useRef(false);
  const initialProfile = useRef(hoSo);
  useEffect(() => {
    if (!film.autoplay) return;
    const id = setTimeout(() => {
      if (autoplayed.current) return;
      autoplayed.current = true;
      void runSample(initialProfile.current);
    }, 800);
    return () => clearTimeout(id);
  }, [film.autoplay, runSample]);

  useEffect(() => () => abort.current?.abort(), []);

  const variants = reduced ? presenceReduced : presence;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pt-10 pb-16 max-sm:px-4 max-sm:pt-6">
        <header className="flex flex-col gap-2">
          <MockBanner />
          <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] text-ink max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
            {t.impact.title}
          </h1>
          <p className="text-ink-2">{t.impact.subtitle}</p>
          <div className="mt-1">
            <ProfileChip hoSo={hoSo} onEdit={() => setProfileOpen(true)} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          {(phase === "idle" || phase === "error") && (
            <motion.div key="drop" variants={variants} initial="hidden" animate="shown" exit="gone">
              <DropZone onFile={(f) => void run(f, hoSo)} onSample={() => void runSample(hoSo)} />
              {phase === "error" && error && (
                <p role="alert" className="mt-3 text-sm font-medium text-crimson">
                  {error}
                </p>
              )}
            </motion.div>
          )}
          {phase === "scanning" && (
            <motion.div key="scan" variants={variants} initial="hidden" animate="shown" exit="gone">
              <Scanning fileName={fileName} />
            </motion.div>
          )}
          {phase === "done" && result && (
            <motion.div key="alert" exit={{ opacity: 0 }}>
              <ImpactAlert result={result} today={film.today} onReset={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProfileSheet
        open={profileOpen}
        hoSo={hoSo}
        onClose={() => setProfileOpen(false)}
        onSave={saveProfile}
      />
    </>
  );
}
