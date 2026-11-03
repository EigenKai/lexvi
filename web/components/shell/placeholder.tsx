import Link from "next/link";
import { vi } from "@/lib/i18n/vi";

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-6 pt-10 max-sm:px-4">
      <h1 className="font-display text-[2rem] leading-[1.3] font-normal tracking-[-0.01em] max-sm:text-[1.625rem] max-sm:font-semibold max-sm:tracking-normal">
        {title}
      </h1>
      <p className="text-ink-2">
        {vi.placeholder.title}. {vi.placeholder.body}
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center font-medium text-brand underline-offset-4 hover:underline"
      >
        {vi.placeholder.back}
      </Link>
    </div>
  );
}
