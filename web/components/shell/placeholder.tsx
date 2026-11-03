"use client";

import Link from "next/link";
import { useT } from "@/components/providers";
import type { Dict } from "@/lib/i18n";

export function Placeholder({ titleKey }: { titleKey: keyof Dict["nav"] }) {
  const t = useT();
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 pt-10 max-sm:px-4">
      <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
        {t.nav[titleKey]}
      </h1>
      <p className="text-ink-2">
        {t.placeholder.title}. {t.placeholder.body}
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center font-medium text-brand underline-offset-4 hover:underline"
      >
        {t.placeholder.back}
      </Link>
    </div>
  );
}
