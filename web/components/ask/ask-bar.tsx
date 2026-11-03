"use client";

import { cn } from "cn";
import { ArrowUp, ImagePlus, Loader2, Mic, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { MOCK_TRANSCRIPT } from "@/lib/api/mock";
import { vi } from "@/lib/i18n/vi";
import { duration, ease } from "@/lib/motion";

type MicState = "idle" | "listening" | "transcribing" | "error";

function IconButton({
  label,
  onClick,
  children,
  className,
  film,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  film?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      data-film={film}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 transition-[background-color,transform] duration-[120ms] hover:bg-surface-sunk active:scale-[0.97]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * DESIGN.md §4.1 AskBar + §4.15 mic states.
 * MOCK: the mic and photo buttons simulate their states only. Real capture (Muse Voice Transcribe,
 * image reading) comes later and is first in the cut order (constraints.md).
 */
export function AskBar({
  value,
  onChange,
  onSubmit,
  busy,
  profile,
  textareaRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  profile: ReactNode;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [mic, setMic] = useState<MicState>("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const startMic = () => {
    if (mic !== "idle" && mic !== "error") {
      timers.current.forEach(clearTimeout);
      setMic("idle");
      return;
    }
    setMic("listening");
    timers.current = [
      setTimeout(() => setMic("transcribing"), 1600),
      setTimeout(() => {
        // MOCK transcript
        onChange(MOCK_TRANSCRIPT);
        setMic("idle");
      }, 2400),
    ];
  };

  const canSend = value.trim().length > 0 && !busy;

  const extras = (
    <>
      <IconButton
        label={vi.mic.idle}
        onClick={startMic}
        film="mic-button"
        pressed={mic === "listening"}
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
        ) : (
          <Mic aria-hidden className="size-5" />
        )}
      </IconButton>
      <IconButton
        label={vi.photo.label}
        onClick={() => fileRef.current?.click()}
        film="photo-button"
      >
        <ImagePlus aria-hidden className="size-5" />
      </IconButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPhoto(f.name);
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
        <div className="px-1 pt-1">{profile}</div>
        <div className="flex items-end gap-1">
          <label htmlFor="ask-input" className="sr-only">
            {vi.ask.inputLabel}
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
            placeholder={vi.ask.placeholder}
            className="min-h-16 flex-1 resize-none bg-transparent px-2 py-2 text-[1.0625rem] leading-[1.6] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
          />
          <div className="flex items-center gap-1 max-sm:hidden">{extras}</div>
          <div className="sm:hidden">
            <IconButton
              label={vi.ask.more}
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
            aria-label={vi.ask.send}
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

      <div aria-live="polite" className="min-h-0 px-1 text-sm">
        {mic === "listening" && <p className="text-brand">{vi.mic.listening}</p>}
        {mic === "transcribing" && <p className="text-ink-2">{vi.mic.transcribing}</p>}
        {mic === "error" && <p className="text-amber">{vi.mic.error}</p>}
        {photo && (
          <p className="flex items-center gap-2 text-ink-2">
            <ImagePlus aria-hidden className="size-4" />
            {vi.photo.attached}: <span className="font-mono text-xs">{photo}</span>
            <span className="text-ink-3">({vi.photo.notConnected})</span>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label={vi.photo.remove}
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-sunk"
            >
              <X aria-hidden className="size-4" />
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
