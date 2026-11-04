"use client";

import { cn } from "cn";
import {
  ArrowUp,
  CalendarCheck,
  FileSearch,
  FlaskConical,
  ImagePlus,
  Loader2,
  Mic,
  Plus,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers";
import {
  InputError,
  type InputErrorCode,
  type PhotoReading,
  readImage,
  transcribe,
  usingMock,
} from "@/lib/api/client";
import { MOCK_PHOTO_READING, MOCK_TRANSCRIPT } from "@/lib/api/mock";
import { shrinkImage, toWav } from "@/lib/audio/wav";
import { formatDate } from "@/lib/format";
import { duration, ease } from "@/lib/motion";

type MicState = "idle" | "listening" | "transcribing" | "error";
const MAX_SECONDS = 60;

function IconButton({
  label,
  onClick,
  children,
  className,
  film,
  pressed,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  film?: string;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      data-film={film}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 transition-[background-color,transform] duration-[120ms] hover:bg-surface-sunk active:scale-[0.97] disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * DESIGN.md §4.1 AskBar + §4.15 mic states.
 * Voice: records in the browser, converts to 24 kHz mono WAV, and sends it to /api/transcribe
 * (Muse Voice Transcribe). The transcript fills the box; the owner checks it and sends.
 * Photo: downscales the picture and sends it to /api/read-image (Muse Spark), which returns a
 * summary and a drafted question — never an answer; answers come only from the verified /ask.
 * Film mode (`canned`) keeps both deterministic with canned example results, each visibly
 * labelled as an example (never as live output).
 */
export function AskBar({
  value,
  onChange,
  onSubmit,
  busy,
  profile,
  textareaRef,
  canned = false,
  onApplyDate,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  profile: ReactNode;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Film mode: canned transcript / photo reading instead of live calls. */
  canned?: boolean;
  /** Set the applied date from a date read on the photo. */
  onApplyDate?: (iso: string) => void;
}) {
  const t = useT();
  const [mic, setMic] = useState<MicState>("idle");
  const [micError, setMicError] = useState<InputErrorCode | null>(null);
  const [micNote, setMicNote] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const [photo, setPhoto] = useState<{ name: string; url: string } | null>(null);
  const [reading, setReading] = useState<PhotoReading | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<InputErrorCode | null>(null);
  const [dateApplied, setDateApplied] = useState<string | null>(null);

  // Canned (example) results are labelled as such, never as live output (W5).
  const [voiceCanned, setVoiceCanned] = useState(false);
  const [photoCanned, setPhotoCanned] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const voiceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const photoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const voiceAbort = useRef<AbortController | null>(null);
  const photoAbort = useRef<AbortController | null>(null);
  // getUserMedia is pending (a second click must not open a second stream).
  const starting = useRef(false);
  // Set when the bar is hidden or unmounted, so a pending recording is not uploaded.
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      // Under cacheComponents the route is hidden (React Activity), not unmounted: the state is
      // kept, so put the inputs back to idle as well as stopping the work.
      cancelled.current = true;
      for (const id of voiceTimers.current) clearTimeout(id);
      for (const id of photoTimers.current) clearTimeout(id);
      voiceAbort.current?.abort();
      photoAbort.current?.abort();
      const rec = recorder.current;
      recorder.current = null;
      if (rec?.state === "recording") rec.stop(); // onstop sees `cancelled` and returns
      rec?.stream.getTracks().forEach((tr) => {
        tr.stop();
      });
      setMic((m) => (m === "error" ? m : "idle"));
      setPhotoBusy(false);
    };
  }, []);
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  /* ── Voice ──────────────────────────────────────────────────────────────────────────── */

  const fail = (code: InputErrorCode) => {
    setMicError(code);
    setMic("error");
  };

  const cannedVoice = () => {
    setMic("listening");
    voiceTimers.current = [
      setTimeout(() => setMic("transcribing"), 1600),
      setTimeout(() => {
        onChange(MOCK_TRANSCRIPT); // MOCK transcript
        setVoiceCanned(true);
        setMic("idle");
      }, 2400),
    ];
  };

  const stopRecording = () => {
    for (const id of voiceTimers.current) clearTimeout(id);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const startMic = async () => {
    // The canned take runs on its own timers; a second click must not cut it short.
    if (mic === "listening") return canned ? undefined : stopRecording();
    if (mic === "transcribing" || starting.current) return;
    setMicError(null);
    setMicNote(false);
    setVoiceCanned(false);
    if (canned) return cannedVoice();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return fail("mic_unavailable");
    }
    // A leftover recorder (should not happen) is discarded, not uploaded.
    const old = recorder.current;
    recorder.current = null;
    if (old) {
      old.onstop = null;
      if (old.state === "recording") old.stop();
      for (const tr of old.stream.getTracks()) tr.stop();
    }
    let stream: MediaStream;
    starting.current = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException).name;
      return fail(
        name === "NotAllowedError" || name === "SecurityError" ? "mic_denied" : "mic_unavailable",
      );
    } finally {
      starting.current = false;
    }
    if (cancelled.current) {
      for (const tr of stream.getTracks()) tr.stop();
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder.current = rec;
    const started = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = async () => {
      for (const tr of stream.getTracks()) tr.stop();
      if (recorder.current === rec) recorder.current = null;
      if (cancelled.current) return;
      setMic("transcribing");
      const ctrl = new AbortController();
      voiceAbort.current = ctrl;
      try {
        if (Date.now() - started < 600) throw new InputError("no_speech");
        const { wav } = await toWav(new Blob(chunks, { type: rec.mimeType }));
        const text = await transcribe(wav, ctrl.signal);
        if (!text) throw new InputError("no_speech");
        if (cancelled.current) return;
        onChange(text);
        setMicNote(true);
        setMic("idle");
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMic("idle");
          return;
        }
        const code = err instanceof InputError ? err.code : "failed";
        // Without a key on the server, mock mode falls back to the canned transcript.
        if (code === "not_configured" && usingMock) {
          onChange(MOCK_TRANSCRIPT); // MOCK transcript
          setVoiceCanned(true);
          setMic("idle");
          return;
        }
        fail(code);
      }
    };
    rec.start();
    setSeconds(0);
    setMic("listening");
    const tick = () => {
      const s = Math.floor((Date.now() - started) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) return stopRecording();
      voiceTimers.current = [setTimeout(tick, 250)];
    };
    tick();
  };

  const micMessage = (code: InputErrorCode | null) => {
    switch (code) {
      case "mic_denied":
        return t.mic.denied;
      case "mic_unavailable":
        return t.mic.unavailable;
      case "no_speech":
        return t.mic.noSpeech;
      case "not_configured":
        return t.mic.notConfigured;
      case "rate_limited":
        return t.photo.rateLimited;
      default:
        return t.mic.error;
    }
  };

  /* ── Photo ──────────────────────────────────────────────────────────────────────────── */

  const clearPhoto = () => {
    photoAbort.current?.abort();
    for (const id of photoTimers.current) clearTimeout(id);
    setPhoto(null);
    setReading(null);
    setPhotoCanned(false);
    setPhotoError(null);
    setPhotoBusy(false);
    setDateApplied(null);
  };

  const onPhoto = async (file: File) => {
    clearPhoto();
    setPhoto({ name: file.name, url: URL.createObjectURL(file) });
    setPhotoBusy(true);
    if (canned) {
      photoTimers.current = [
        setTimeout(() => {
          setReading({ ...MOCK_PHOTO_READING }); // MOCK reading
          setPhotoCanned(true);
          setPhotoBusy(false);
        }, 1400),
      ];
      return;
    }
    const ctrl = new AbortController();
    photoAbort.current = ctrl;
    try {
      if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type) && file.type !== "") {
        throw new InputError("unsupported_type");
      }
      const small = await shrinkImage(file).catch(() => {
        throw new InputError("unsupported_type");
      });
      setReading(await readImage(small, ctrl.signal));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const code = err instanceof InputError ? err.code : "failed";
      if (code === "not_configured" && usingMock) {
        setReading({ ...MOCK_PHOTO_READING }); // MOCK reading
        setPhotoCanned(true);
      } else setPhotoError(code);
    } finally {
      // A newer photo (or clearing) owns the busy flag now.
      if (photoAbort.current === ctrl) setPhotoBusy(false);
    }
  };

  const photoMessage = (code: InputErrorCode) =>
    code === "too_large"
      ? t.photo.tooLarge
      : code === "unsupported_type"
        ? t.photo.unsupported
        : code === "not_configured"
          ? t.photo.notConfigured
          : code === "rate_limited"
            ? t.photo.rateLimited
            : t.photo.failed;

  const useQuestion = () => {
    if (!reading) return;
    if (reading.cau_hoi_goi_y) onChange(reading.cau_hoi_goi_y);
    if (reading.ngay_tren_giay && onApplyDate) {
      onApplyDate(reading.ngay_tren_giay);
      setDateApplied(reading.ngay_tren_giay);
    }
    textareaRef?.current?.focus();
  };

  const canSend = value.trim().length > 0 && !busy;

  const extras = (
    <>
      <IconButton
        label={mic === "listening" ? t.mic.stop : t.mic.idle}
        onClick={() => void startMic()}
        film="mic-button"
        pressed={mic === "listening"}
        disabled={mic === "transcribing"}
        className={cn(mic === "listening" && "text-brand", mic === "error" && "text-amber")}
      >
        {mic === "listening" && (
          <>
            {/* Pulsing ring (loops only while listening); reduced motion → static ring. */}
            <span
              aria-hidden
              className="absolute inset-1 rounded-full border-2 border-brand/50 motion-safe:animate-ping"
            />
            <span
              aria-hidden
              className="absolute inset-1 rounded-full border-2 border-brand motion-safe:hidden"
            />
          </>
        )}
        {mic === "transcribing" ? (
          <Loader2 aria-hidden className="size-5 motion-safe:animate-spin" />
        ) : mic === "listening" && !canned ? (
          <Square aria-hidden className="size-4 fill-current" />
        ) : (
          <Mic aria-hidden className="size-5" />
        )}
      </IconButton>
      <IconButton
        label={t.photo.label}
        onClick={() => fileRef.current?.click()}
        film="photo-button"
        disabled={photoBusy}
      >
        <ImagePlus aria-hidden className="size-5" />
      </IconButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPhoto(f);
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <div data-film="ask-bar" className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSubmit();
        }}
        className="flex flex-col gap-2 rounded-lg border border-line-strong bg-surface p-2 shadow-card focus-within:border-brand focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
      >
        {/* <640 the chip sits in the page header instead, so the sticky bar stays slim. */}
        <div className="px-1 pt-1 max-sm:hidden">{profile}</div>
        <div className="flex items-end gap-1">
          <label htmlFor="ask-input" className="sr-only">
            {t.ask.inputLabel}
          </label>
          <textarea
            id="ask-input"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            rows={2}
            placeholder={t.ask.placeholder}
            className="min-h-16 max-h-48 flex-1 resize-none [field-sizing:content] [scrollbar-width:thin] max-sm:min-h-12 max-sm:max-h-36 bg-transparent px-2 py-2 text-[1.0625rem] leading-[1.6] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
          />
          <div className="flex items-center gap-1 max-sm:hidden">{extras}</div>
          <div className="sm:hidden">
            <IconButton
              label={t.ask.more}
              onClick={() => setMoreOpen((o) => !o)}
              pressed={moreOpen}
            >
              <Plus
                aria-hidden
                className={cn("size-5 transition-transform", moreOpen && "rotate-45")}
              />
            </IconButton>
          </div>
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t.ask.send}
            data-film="send-button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-[opacity,transform] duration-[120ms] active:scale-[0.97] disabled:opacity-40"
          >
            {busy ? (
              <Loader2 aria-hidden className="size-5 motion-safe:animate-spin" />
            ) : (
              <ArrowUp aria-hidden className="size-5" />
            )}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {moreOpen && (
            <motion.div
              className="flex gap-1 overflow-hidden px-1 sm:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: duration.ui, ease: ease.ui }}
            >
              {extras}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div data-film="voice-status" aria-live="polite" className="min-h-0 px-1 text-sm">
        {mic === "listening" && (
          <p className="flex items-center gap-2 text-brand">
            {t.mic.listening}
            {!canned && (
              <span className="font-mono text-xs text-ink-3 tabular-nums">
                {t.mic.seconds(seconds, MAX_SECONDS)}
              </span>
            )}
          </p>
        )}
        {mic === "transcribing" && <p className="text-ink-2">{t.mic.transcribing}</p>}
        {mic === "error" && (
          <p className="flex items-start gap-1.5 text-amber">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {micMessage(micError)}
          </p>
        )}
        {voiceCanned && mic === "idle" && (
          <p
            data-film="voice-canned"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-2"
          >
            <FlaskConical aria-hidden className="size-3.5" />
            {t.mic.canned}
          </p>
        )}
        {micNote && mic === "idle" && <p className="text-ink-3">{t.mic.check}</p>}
      </div>

      {photo && (
        <section
          data-film="photo-summary"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
        >
          <div className="flex items-center gap-3">
            {/* biome-ignore lint/performance/noImgElement: local object URL preview, not an optimisable asset */}
            <img
              src={photo.url}
              alt=""
              className="size-12 shrink-0 rounded-md border border-line object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-ink-3">{photo.name}</p>
              {photoBusy && (
                <p className="flex items-center gap-1.5 text-sm text-ink-2">
                  <Loader2 aria-hidden className="size-4 text-brand motion-safe:animate-spin" />
                  {t.photo.reading}
                </p>
              )}
              {reading && (
                <p lang="vi" className="text-sm font-semibold text-ink">
                  {reading.loai_giay_to}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={clearPhoto}
              aria-label={t.photo.remove}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-sunk"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>

          {photoError && (
            <p className="flex items-start gap-1.5 text-sm text-amber">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {photoMessage(photoError)}
            </p>
          )}

          {reading && (
            <>
              {!reading.la_giay_to_thue && (
                <p className="flex items-start gap-1.5 text-sm text-amber">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {t.photo.notTax}
                </p>
              )}
              {reading.tom_tat && (
                <p lang="vi" className="text-[0.9375rem] leading-[1.6] text-ink-2">
                  {reading.tom_tat}
                </p>
              )}
              {reading.ngay_tren_giay && (
                <p className="font-mono text-xs text-ink-3 tabular-nums">
                  {t.photo.dateFound(formatDate(reading.ngay_tren_giay))}
                </p>
              )}
              {photoCanned ? (
                <p
                  data-film="photo-canned"
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-2"
                >
                  <FlaskConical aria-hidden className="size-3.5" />
                  {t.photo.canned}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-ink-3">
                  <FileSearch aria-hidden className="size-3.5" />
                  {t.photo.readBy}
                </p>
              )}
              {t.sourceNote && <p className="text-xs text-ink-3">{t.sourceNote}</p>}
              {reading.cau_hoi_goi_y && (
                <div className="flex flex-col gap-2 rounded-md bg-surface-sunk px-3 py-2">
                  <p lang="vi" className="text-[0.9375rem] text-ink">
                    “{reading.cau_hoi_goi_y}”
                  </p>
                  <button
                    type="button"
                    data-film="photo-use-question"
                    onClick={useQuestion}
                    className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-paper"
                  >
                    {t.photo.useQuestion}
                  </button>
                </div>
              )}
              {dateApplied && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
                  <CalendarCheck aria-hidden className="size-3.5" />
                  {t.photo.dateApplied(formatDate(dateApplied))}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
