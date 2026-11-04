import raw from "./results.json";

/**
 * Benchmark results, imported by `pnpm benchmark:import` from the backend's
 * `eval/results-<timestamp>.json` (scripts/run_eval.py). Never edited by hand and never filled
 * with placeholder numbers: until a real run exists, `available` is false and the screen says so.
 */
export const METRICS = ["dan_dieu_cu", "dung_can_cu", "trich_sai", "can_xac_nhan"] as const;
export type MetricKey = (typeof METRICS)[number];
export type SystemKey = "rag_thuong" | "lexvi";
/** Optional counts: crashed runs, no answer given, and invented (non-existent) provision ids. */
export const EXTRAS = ["loi", "khong_tra_loi", "id_bia"] as const;
export type ExtraKey = (typeof EXTRAS)[number];

export interface Count {
  x: number;
  n: number;
}

export interface BenchmarkRow {
  cau: number;
  cau_hoi: string;
  ngay_ap_dung: string;
  rag_thuong: Record<MetricKey, boolean> & { loi?: boolean };
  lexvi: Record<MetricKey, boolean> & { loi?: boolean };
}

export interface BenchmarkData {
  available: true;
  generated_at: string;
  source_file: string;
  model: string;
  n: number;
  summary: Record<SystemKey, Record<MetricKey, Count>>;
  /** Present only when the results file carries them. */
  extra: Record<SystemKey, Partial<Record<ExtraKey, Count>>>;
  rows: BenchmarkRow[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** "3/18" → { x: 3, n: 18 }; anything else (or an impossible count) → null. */
function parseCount(v: unknown): Count | null {
  if (typeof v !== "string") return null;
  const m = /^(\d+)\/(\d+)$/.exec(v.trim());
  if (!m) return null;
  const c = { x: Number(m[1]), n: Number(m[2]) };
  return c.n > 0 && c.x <= c.n ? c : null;
}

export function parseBenchmark(v: unknown): BenchmarkData | null {
  if (!isObj(v) || v.available !== true || !isObj(v.summary)) return null;
  const summary = {} as BenchmarkData["summary"];
  for (const sys of ["rag_thuong", "lexvi"] as const) {
    const s = v.summary[sys];
    if (!isObj(s)) return null;
    const out = {} as Record<MetricKey, Count>;
    for (const m of METRICS) {
      const c = parseCount(s[m]);
      if (!c) return null;
      out[m] = c;
    }
    summary[sys] = out;
  }
  // Every headline count must be over the same N as the header (no mixed samples).
  const n = typeof v.n === "number" ? v.n : summary.lexvi.dan_dieu_cu.n;
  for (const sys of ["rag_thuong", "lexvi"] as const)
    for (const m of METRICS) if (summary[sys][m].n !== n) return null;
  const flags = (o: unknown): BenchmarkRow["lexvi"] => {
    const r = isObj(o) ? o : {};
    const f = Object.fromEntries(METRICS.map((m) => [m, r[m] === true])) as BenchmarkRow["lexvi"];
    // A crash is recorded as an error string (or true) on the row.
    if (r.loi === true || (typeof r.loi === "string" && r.loi !== "")) f.loi = true;
    return f;
  };
  const rows = (Array.isArray(v.rows) ? v.rows : []).filter(isObj).map((r) => ({
    cau: typeof r.cau === "number" ? r.cau : 0,
    cau_hoi: typeof r.cau_hoi === "string" ? r.cau_hoi : "",
    ngay_ap_dung: typeof r.ngay_ap_dung === "string" ? r.ngay_ap_dung : "",
    rag_thuong: flags(r.rag_thuong),
    lexvi: flags(r.lexvi),
  }));
  const extra = { rag_thuong: {}, lexvi: {} } as BenchmarkData["extra"];
  for (const sys of ["rag_thuong", "lexvi"] as const) {
    const s = v.summary[sys] as Record<string, unknown>;
    for (const k of EXTRAS) {
      const c = parseCount(s[k]);
      if (c) extra[sys][k] = c;
    }
    // Older results files: count crashes from the rows when the summary has no "loi".
    const crashed = rows.filter((r) => r[sys].loi).length;
    if (!extra[sys].loi && crashed > 0) extra[sys].loi = { x: crashed, n: rows.length };
  }
  return {
    available: true,
    generated_at: typeof v.generated_at === "string" ? v.generated_at : "",
    source_file: typeof v.source_file === "string" ? v.source_file : "",
    model: typeof v.model === "string" ? v.model : "",
    n,
    summary,
    extra,
    rows,
  };
}

export const benchmark: BenchmarkData | null = parseBenchmark(raw);
