import { en } from "./en";
import { vi } from "./vi";

/** Literal strings widened to `string`, functions kept — so `en` must have every key `vi` has. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<typeof vi>;
export type Locale = "en" | "vi";

export const DICTS: Record<Locale, Dict> = { en, vi };
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_KEY = "lexvi.lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "vi";
}
