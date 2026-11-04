import type { IsoDate } from "./api/contract";
import { isIsoDate, todayInVietnam } from "./format";

/**
 * Camera-ready capture mode (DESIGN.md §13.1).
 *
 *   ?film=1                 deterministic mode: fixed "today", fixed latency, no caret, no scrollbars
 *   &today=2026-11-04       the date treated as today (default 2026-11-04 in film mode)
 *   &date=2026-03-15        initial applied date (default: today)
 *   &q=...                  prefilled question
 *   &scenario=verified|unverified   force a mock scenario (otherwise picked from the question)
 *   &autoplay=1             submit the prefilled question ~0.8 s after load
 *   &pace=2                 slow the verification ribbon by this factor (readability on camera)
 *
 * Outside film mode only `date`, `q` and `scenario` are read.
 */
export interface FilmConfig {
  enabled: boolean;
  today: IsoDate;
  initialDate: IsoDate | null;
  question: string | null;
  scenario: "verified" | "unverified" | null;
  autoplay: boolean;
  pace: number;
  /** Mock round-trip latency in ms. */
  latencyMs: number;
}

export const FILM_DEFAULT_TODAY = "2026-11-04";

export function readFilmConfig(search: string): FilmConfig {
  const p = new URLSearchParams(search);
  const enabled = p.get("film") === "1";
  const todayParam = p.get("today");
  const dateParam = p.get("date");
  const scenario = p.get("scenario");
  const pace = Number(p.get("pace"));
  return {
    enabled,
    today:
      enabled && isIsoDate(todayParam)
        ? todayParam
        : enabled
          ? FILM_DEFAULT_TODAY
          : todayInVietnam(),
    initialDate: isIsoDate(dateParam) ? dateParam : null,
    question: p.get("q"),
    scenario: scenario === "verified" || scenario === "unverified" ? scenario : null,
    autoplay: enabled && p.get("autoplay") === "1",
    pace: enabled && pace >= 0.5 && pace <= 4 ? pace : 1,
    latencyMs: enabled ? 900 : 700,
  };
}
