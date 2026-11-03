"use client";

import { cn } from "cn";
import { Languages } from "lucide-react";
import { useLocale } from "@/components/providers";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["en", "vi"];

/** EN | VI segmented control. English is the default (judges read English). */
export function LangToggle() {
  const { locale, setLocale, t } = useLocale();
  return (
    <fieldset data-film="lang-toggle" className="inline-flex items-center gap-1.5">
      <legend className="sr-only">{t.lang.label}</legend>
      <Languages aria-hidden className="size-4 text-ink-3" />
      <span className="inline-flex rounded-md border border-line-strong bg-surface p-0.5">
        {OPTIONS.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={locale === l}
            aria-label={l === "en" ? t.lang.enName : t.lang.viName}
            onClick={() => setLocale(l)}
            className={cn(
              "inline-flex min-h-10 min-w-11 items-center justify-center rounded-sm px-2 font-mono text-xs font-medium transition-colors",
              locale === l ? "bg-brand text-white" : "text-ink-2 hover:bg-surface-sunk",
            )}
          >
            {l === "en" ? t.lang.en : t.lang.vi}
          </button>
        ))}
      </span>
    </fieldset>
  );
}
