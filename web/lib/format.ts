import type { DieuKhoan, IsoDate, LoaiVanBan } from "./api/contract";

const SHORT_TYPE: Record<LoaiVanBan, string> = {
  luật: "Luật",
  "nghị định": "NĐ",
  "thông tư": "TT",
  "nghị quyết": "NQ",
};

/** "NĐ 141/2026/NĐ-CP" */
export function docLabel(loai: string | undefined, soHieu: string): string {
  // Unknown types (e.g. the backend's "nghi_dinh") fall back to the number alone; the number
  // itself already carries the type suffix (…/NĐ-CP, …/QH15).
  const short = loai ? SHORT_TYPE[loai as LoaiVanBan] : undefined;
  return short ? `${short} ${soHieu}` : soHieu;
}

/** "Điều 8 khoản 5" — dieu/khoan may be numbers (mock) or strings like "10a" (backend). */
export function articleLabel(dk: {
  dieu?: Pick<DieuKhoan, "dieu">["dieu"] | string;
  khoan?: Pick<DieuKhoan, "khoan">["khoan"] | string;
}): string {
  if (dk.dieu === undefined || dk.dieu === "") return "";
  return dk.khoan ? `Điều ${dk.dieu} khoản ${dk.khoan}` : `Điều ${dk.dieu}`;
}

/** Parse "yyyy-MM-dd" as a calendar date (no time zone shift). */
export function parseIso(iso: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** ISO → dd/MM/yyyy (DESIGN.md §3). */
export function formatDate(iso: IsoDate): string {
  const { y, m, d } = parseIso(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const plain = new Intl.NumberFormat("vi-VN");

/** 500000000 → "500.000.000 ₫". */
export function formatVnd(amount: number): string {
  return vnd.format(amount);
}

/** 800000000 → "800 triệu đồng"; 1000000000 → "1 tỷ đồng". For prose, not tables. */
export function formatVndWords(amount: number): string {
  // Truncate (never round up), so 999.999.999 reads "999,999 triệu", not "1.000 triệu".
  if (amount >= 1_000_000_000)
    return `${plain.format(Math.floor(amount / 1_000_000) / 1_000)} tỷ đồng`;
  if (amount >= 1_000_000) return `${plain.format(Math.floor(amount / 1_000) / 1_000)} triệu đồng`;
  return `${plain.format(amount)} đồng`;
}

function dayNumber(iso: IsoDate): number {
  const { y, m, d } = parseIso(iso);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(dayNumber(to) - dayNumber(from));
}

/** Compare two ISO dates: <0, 0, >0. */
export function compareIso(a: IsoDate, b: IsoDate): number {
  return dayNumber(a) - dayNumber(b);
}

/** Today's date in Vietnam (UTC+7) as ISO. */
export function todayInVietnam(now = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as yyyy-MM-dd
}
