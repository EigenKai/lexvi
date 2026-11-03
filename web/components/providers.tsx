"use client";

import { MotionConfig } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { HoSo } from "@/lib/api/contract";
import { DEFAULT_LOCALE, DICTS, type Dict, isLocale, LOCALE_KEY, type Locale } from "@/lib/i18n";

/* ── Locale ───────────────────────────────────────────────────────────────────────────────────
 * Read order: ?lang= (always; film mode uses only this), then localStorage, then English.
 * A tiny external store so every consumer re-renders on change; the server snapshot is the
 * default, so the static shell renders in English.
 */
const listeners = new Set<() => void>();
let current: Locale | null = null;

function readInitial(): Locale {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  if (isLocale(fromUrl)) return fromUrl;
  if (params.get("film") === "1") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // storage blocked (private mode etc.) — fall through to the default
  }
  return DEFAULT_LOCALE;
}

const localeStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get(): Locale {
    if (current === null) current = readInitial();
    return current;
  },
  set(next: Locale) {
    current = next;
    const film = new URLSearchParams(window.location.search).get("film") === "1";
    if (!film) {
      try {
        window.localStorage.setItem(LOCALE_KEY, next);
      } catch {
        // not persisted; the choice still applies for this page view
      }
    }
    for (const l of listeners) l();
  },
};

interface LocaleCtx {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
}
const LocaleContext = createContext<LocaleCtx>({
  locale: DEFAULT_LOCALE,
  t: DICTS[DEFAULT_LOCALE],
  setLocale: () => {},
});

function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(localeStore.subscribe, localeStore.get, () => DEFAULT_LOCALE);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((l: Locale) => localeStore.set(l), []);
  const value = useMemo(() => ({ locale, t: DICTS[locale], setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;

/* ── Business profile (ho_so), shared by the Ask and Impact screens ───────────────────────────
 * In memory only: survives client-side navigation, resets on reload (keeps film takes identical).
 */
// MOCK — the persona's profile (CLAUDE.md §3). [ILLUSTRATIVE] revenue figure.
export const DEFAULT_PROFILE: HoSo = {
  loai_hinh: "ho_kinh_doanh",
  nganh: "Ăn uống (quán cà phê)",
  doanh_thu_nam: 800_000_000,
  dia_ban: "TP. Hồ Chí Minh",
};

interface ProfileCtx {
  hoSo: HoSo;
  setHoSo: (h: HoSo) => void;
}
const ProfileContext = createContext<ProfileCtx>({ hoSo: DEFAULT_PROFILE, setHoSo: () => {} });

function ProfileProvider({ children }: { children: ReactNode }) {
  const [hoSo, setHoSo] = useState<HoSo>(DEFAULT_PROFILE);
  const value = useMemo(() => ({ hoSo, setHoSo }), [hoSo]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LocaleProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </LocaleProvider>
    </MotionConfig>
  );
}
