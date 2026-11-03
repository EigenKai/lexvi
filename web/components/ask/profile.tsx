"use client";

import { Store } from "lucide-react";
import { useId, useState } from "react";
import { useLocale, useT } from "@/components/providers";
import type { HoSo } from "@/lib/api/contract";
import { formatVnd, formatVndWords } from "@/lib/format";
import { Drawer } from "../ui/drawer";

/** DESIGN.md §4.6 — always visible: every answer depends on the profile. */
export function ProfileChip({
  hoSo,
  onEdit,
  film = "profile-chip",
}: {
  hoSo: HoSo;
  onEdit: () => void;
  film?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  // Vietnamese reads "800 triệu đồng"; English shows the plain amount "800.000.000 ₫".
  const revenue =
    locale === "vi" ? formatVndWords(hoSo.doanh_thu_nam) : formatVnd(hoSo.doanh_thu_nam);
  return (
    <button
      type="button"
      onClick={onEdit}
      data-film={film}
      aria-label={`${t.profile.chipLabel}: ${t.profile.loai[hoSo.loai_hinh]}, ${hoSo.nganh}, ${revenue}${t.profile.perYear}, ${hoSo.dia_ban}. ${t.profile.edit}`}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-brand/20 bg-brand-tint px-3 text-left text-sm text-brand transition-colors hover:border-brand/40"
    >
      <Store aria-hidden className="size-4 shrink-0" />
      <span className="truncate">
        <span className="font-semibold">{t.profile.loai[hoSo.loai_hinh]}</span>
        <span className="text-ink-2"> · {hoSo.nganh} · </span>
        <span className="font-medium tabular-nums">
          {revenue}
          {t.profile.perYear}
        </span>
        <span className="text-ink-2 max-sm:hidden"> · {hoSo.dia_ban}</span>
      </span>
    </button>
  );
}

const field =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[0.9375rem] text-ink";

export function ProfileSheet({
  open,
  hoSo,
  onClose,
  onSave,
}: {
  open: boolean;
  hoSo: HoSo;
  onClose: () => void;
  onSave: (h: HoSo) => void;
}) {
  const t = useT();
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t.profile.title}
      description={t.profile.description}
      film="profile-sheet"
    >
      {open && <ProfileForm hoSo={hoSo} onSave={onSave} />}
    </Drawer>
  );
}

function ProfileForm({ hoSo, onSave }: { hoSo: HoSo; onSave: (h: HoSo) => void }) {
  const t = useT();
  const [draft, setDraft] = useState(hoSo);
  const id = useId();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-loai`} className="text-sm font-semibold">
          {t.profile.loaiHinh}
        </label>
        <select
          id={`${id}-loai`}
          className={field}
          value={draft.loai_hinh}
          onChange={(e) => setDraft({ ...draft, loai_hinh: e.target.value as HoSo["loai_hinh"] })}
        >
          <option value="ho_kinh_doanh">{t.profile.loai.ho_kinh_doanh}</option>
          <option value="doanh_nghiep_nho">{t.profile.loai.doanh_nghiep_nho}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-nganh`} className="text-sm font-semibold">
          {t.profile.nganh}
        </label>
        <input
          id={`${id}-nganh`}
          className={field}
          value={draft.nganh}
          onChange={(e) => setDraft({ ...draft, nganh: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-dt`} className="text-sm font-semibold">
          {t.profile.doanhThu}
        </label>
        <input
          id={`${id}-dt`}
          className={`${field} font-mono tabular-nums`}
          inputMode="numeric"
          value={draft.doanh_thu_nam.toLocaleString("vi-VN")}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ""));
            if (Number.isFinite(n)) setDraft({ ...draft, doanh_thu_nam: n });
          }}
          aria-describedby={`${id}-dt-hint`}
        />
        <p id={`${id}-dt-hint`} className="text-xs text-ink-3 tabular-nums">
          {formatVnd(draft.doanh_thu_nam)} · {formatVndWords(draft.doanh_thu_nam)}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-dia`} className="text-sm font-semibold">
          {t.profile.diaBan}
        </label>
        <input
          id={`${id}-dia`}
          className={field}
          value={draft.dia_ban}
          onChange={(e) => setDraft({ ...draft, dia_ban: e.target.value })}
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 font-medium text-white transition-transform duration-[120ms] active:scale-[0.97]"
      >
        {t.profile.save}
      </button>
    </form>
  );
}
