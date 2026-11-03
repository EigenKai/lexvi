/** Small validators for untrusted JSON (backend responses are model output). */
export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
export const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
