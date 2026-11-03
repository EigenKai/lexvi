"use client";

import { cn } from "cn";
import { FileText, FileUp, Loader2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { useT } from "@/components/providers";
import { MAX_PDF_BYTES, usingMock } from "@/lib/api/client";

/** True when the first bytes are "%PDF" (the backend checks the same). */
async function looksLikePdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}

/**
 * DESIGN.md §4.10 — dashed drop target for a new legal PDF. Validates type, magic bytes and size
 * on the client so the user gets an instant, specific message.
 */
export function DropZone({
  onFile,
  onSample,
}: {
  onFile: (f: File) => void;
  onSample: () => void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) return setError(t.impact.errTooBig);
    if (!(await looksLikePdf(file))) return setError(t.impact.errNotPdf);
    setError(null);
    onFile(file);
  };

  return (
    <section
      data-film="drop-zone"
      aria-labelledby={titleId}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void accept(e.dataTransfer.files[0]);
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors max-sm:px-4 max-sm:py-8",
        over ? "border-brand bg-brand-tint" : "border-line-strong bg-surface",
      )}
    >
      <FileUp aria-hidden className="size-8 text-brand" />
      <div>
        <h2 id={titleId} className="text-base font-semibold text-ink">
          {t.impact.dropTitle}
        </h2>
        <p className="text-sm text-ink-3">{t.impact.dropHint}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          data-film="choose-button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 font-medium text-white transition-transform duration-[120ms] active:scale-[0.97]"
        >
          <FileText aria-hidden className="size-4" />
          {t.impact.choose}
        </button>
        {usingMock && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              onSample();
            }}
            data-film="sample-button"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-medium text-ink transition-[background-color,transform] duration-[120ms] hover:bg-surface-sunk active:scale-[0.97]"
          >
            <Sparkles aria-hidden className="size-4 text-brand" />
            {t.impact.sample}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        aria-label={t.impact.choose}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p role="alert" className="min-h-6 text-sm font-medium text-crimson">
        {error}
      </p>
    </section>
  );
}

/**
 * Scanning state: a page thumbnail with a brand-tint band sweeping over it (1.2 s loop), shown only
 * while the request runs — it unmounts, and so stops, on result. Reduced motion: spinner + text.
 */
export function Scanning({ fileName }: { fileName: string }) {
  const t = useT();
  const reduced = useReducedMotion();
  return (
    <section
      data-film="scan"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface px-6 py-10 text-center"
    >
      {reduced ? (
        <Loader2 aria-hidden className="size-8 text-brand" />
      ) : (
        <div
          aria-hidden
          className="relative h-40 w-30 overflow-hidden rounded-md border border-line bg-paper shadow-card"
        >
          <div className="flex flex-col gap-2 px-3 pt-4">
            {[70, 90, 80, 95, 60, 85, 75, 50].map((w) => (
              <span key={w} className="h-1.5 rounded-full bg-line" style={{ width: `${w}%` }} />
            ))}
          </div>
          <motion.span
            className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-brand-tint to-transparent"
            initial={{ top: "-25%" }}
            animate={{ top: "100%" }}
            transition={{
              duration: 1.2,
              ease: [0.45, 0, 0.2, 1],
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>
      )}
      <div>
        <p className="font-semibold text-ink">{t.impact.scanning}</p>
        <p className="font-mono text-xs text-ink-3">{fileName}</p>
        <p className="mt-1 text-sm text-ink-2">{t.impact.scanningHint}</p>
      </div>
    </section>
  );
}
