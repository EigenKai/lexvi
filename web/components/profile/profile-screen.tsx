"use client";

import { CircleCheck, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile, useT } from "@/components/providers";
import { ProfileForm } from "../ask/profile";

/** /ho-so — edit the business profile that every answer and alert depends on (DESIGN.md §4.6). */
export function ProfileScreen() {
  const t = useT();
  const { hoSo, setHoSo } = useProfile();
  const [saved, setSaved] = useState(false);
  // Remount the form when the stored profile arrives after hydration, so it shows those values.
  const formKey = JSON.stringify(hoSo);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(id);
  }, [saved]);

  const how: [string, string][] = [
    [t.profile.loaiHinh, t.profilePage.how.loaiHinh],
    [t.profile.doanhThu, t.profilePage.how.doanhThu],
    [t.profile.nganh, t.profilePage.how.nganh],
    [t.profile.diaBan, t.profilePage.how.diaBan],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 pt-10 pb-16 max-sm:px-4 max-sm:pt-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] text-ink max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
          {t.profilePage.title}
        </h1>
        <p className="text-ink-2">{t.profilePage.subtitle}</p>
      </header>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card max-sm:p-4">
        <ProfileForm
          key={formKey}
          hoSo={hoSo}
          film="profile-form"
          onSave={(h) => {
            setHoSo(h);
            setSaved(true);
          }}
        />
        <p aria-live="polite" className="mt-3 min-h-6 text-sm">
          {saved && (
            <span
              data-film="profile-saved"
              className="inline-flex items-center gap-1.5 font-medium text-jade"
            >
              <CircleCheck aria-hidden className="size-4" />
              {t.profilePage.saved}
            </span>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <Info aria-hidden className="size-3.5" />
          {t.profilePage.stored}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-2">{t.profilePage.howTitle}</h2>
        <dl className="flex flex-col gap-3">
          {how.map(([field, text]) => (
            <div key={field} className="rounded-md border border-line bg-surface px-4 py-3">
              <dt className="text-sm font-semibold text-ink">{field}</dt>
              <dd className="text-sm text-ink-2">{text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
