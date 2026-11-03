"use client";

import { cn } from "cn";
import { FileText } from "lucide-react";
import type { ChiTietDieuKhoan, TrangThai, TrichDan } from "@/lib/api/contract";
import { articleLabel, docLabel } from "@/lib/format";
import { vi } from "@/lib/i18n/vi";
import { STATUS_STYLE } from "../status";

export interface ResolvedCitation {
  trich: TrichDan;
  /** Null when the backend has no detail endpoint yet. */
  detail: ChiTietDieuKhoan | null;
  /** Null when unknown (no detail). */
  status: TrangThai | null;
}

export function citationLabel(c: ResolvedCitation): string {
  if (!c.detail) return c.trich.id;
  const { dieu_khoan, van_ban } = c.detail;
  return `${articleLabel(dieu_khoan)} · ${docLabel(van_ban.loai, van_ban.so_hieu)}`;
}

/** DESIGN.md §4.3 — mono pill, status-tinted, icon left, opens the CitationDrawer. */
export function CitationChip({
  citation,
  onOpen,
  size = "md",
  film,
}: {
  citation: ResolvedCitation;
  onOpen: () => void;
  size?: "sm" | "md";
  film?: string;
}) {
  const s = citation.status ? STATUS_STYLE[citation.status] : null;
  const Icon = s?.icon ?? FileText;
  const label = citationLabel(citation);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-film={film}
      aria-label={`${label}${s ? ` — ${s.label}` : ""}. ${vi.openArticle}`}
      aria-haspopup="dialog"
      className={cn(
        "relative inline-flex max-w-full items-center gap-1.5 rounded-full border text-left font-mono font-medium transition-[background-color,transform] duration-[120ms] ease-[var(--ease-ui)] active:scale-[0.97]",
        s ? [s.text, s.tint, s.border] : "border-line-strong bg-surface text-ink-2",
        "hover:brightness-[0.97]",
        // sm: 32 px visual, 44 px hit area via an invisible extension (WCAG 2.5.8 / DESIGN.md §4).
        size === "sm"
          ? "min-h-8 px-2.5 text-xs before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
          : "min-h-11 px-3.5 text-[0.8125rem]",
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3.5 shrink-0" : "size-4 shrink-0"} />
      <span className="truncate">{label}</span>
      {/* Status is never colour-only: the word is always visible (DESIGN.md §2.2). */}
      {s && (
        <span aria-hidden className="shrink-0 border-l border-current/25 pl-1.5 font-sans">
          {s.label}
        </span>
      )}
    </button>
  );
}
