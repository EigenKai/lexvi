"use client";

import { cn } from "cn";
import {
  BadgeCheck,
  BookOpen,
  CircleSlash,
  GitCommitHorizontal,
  type LucideIcon,
  TriangleAlert,
} from "lucide-react";
import type { TrangThai } from "@/lib/api/contract";
import { vi } from "@/lib/i18n/vi";

/** DESIGN.md §2.2 — status is always colour + icon + word. */
export const STATUS_STYLE: Record<
  TrangThai,
  { icon: LucideIcon; text: string; tint: string; border: string; label: string }
> = {
  con_hieu_luc: {
    icon: BadgeCheck,
    text: "text-jade",
    tint: "bg-jade-tint",
    border: "border-jade/30",
    label: vi.status.con_hieu_luc,
  },
  da_sua_doi: {
    icon: GitCommitHorizontal,
    text: "text-amend",
    tint: "bg-amend-tint",
    border: "border-amend/30",
    label: vi.status.da_sua_doi,
  },
  het_hieu_luc: {
    icon: CircleSlash,
    text: "text-crimson",
    tint: "bg-crimson-tint",
    border: "border-crimson/30",
    label: vi.status.het_hieu_luc,
  },
  can_xac_nhan: {
    icon: TriangleAlert,
    text: "text-amber",
    tint: "bg-amber-tint",
    border: "border-amber/30",
    label: vi.status.can_xac_nhan,
  },
  huong_dan: {
    icon: BookOpen,
    text: "text-brand",
    tint: "bg-brand-tint",
    border: "border-brand/30",
    label: vi.status.huong_dan,
  },
};

export function StatusBadge({
  status,
  label,
  size = "md",
  className,
}: {
  status: TrangThai;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium",
        s.text,
        s.tint,
        s.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />
      {label ?? s.label}
    </span>
  );
}
