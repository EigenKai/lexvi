import raw from "./results.json";

/**
 * Benchmark results, imported by `pnpm benchmark:import` from the backend's
 * `eval/results-<timestamp>.json` (scripts/run_eval.py). Never edited by hand and never filled
 * with placeholder numbers: until a real run exists, `available` is false and the screen says so.
 */
export const METRICS = ["dan_dieu_cu", "dung_can_cu", "trich_sai", "can_xac_nhan"] as const;
export type MetricKey = (typeof METRICS)[number];
export type SystemKey = "rag_thuong" | "lexvi";

export interface Count {
  x: number;
  n: number;
}

export interface BenchmarkRow {
  cau: number;
  cau_hoi: string;
  ngay_ap_dung: string;
  rag_thuong: Record<MetricKey, boolean>;
  lexvi: Record<MetricKey, boolean>;
}

export interface BenchmarkData {
  available: true;
  generated_at: string;
  source_file: string;
  model: string;
  n: number;
  summary: Record<SystemKey, Record<MetricKey, Count>>;
  rows: BenchmarkRow[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** "3/18" → { x: 3, n: 18 }; anything else → null. */
function parseCount(v: unknown): Count | null {
  if (typeof v !== "string") return null;
  const m = /^(\d+)\/(\d+)$/.exec(v.trim());
  return m ? { x: Number(m[1]), n: Number(m[2]) } : null;
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
  const flags = (o: unknown): Record<MetricKey, boolean> => {
    const r = isObj(o) ? o : {};
    return Object.fromEntries(METRICS.map((m) => [m, r[m] === true])) as Record<MetricKey, boolean>;
  };
  const rows = (Array.isArray(v.rows) ? v.rows : []).filter(isObj).map((r) => ({
    cau: typeof r.cau === "number" ? r.cau : 0,
    cau_hoi: typeof r.cau_hoi === "string" ? r.cau_hoi : "",
    ngay_ap_dung: typeof r.ngay_ap_dung === "string" ? r.ngay_ap_dung : "",
    rag_thuong: flags(r.rag_thuong),
    lexvi: flags(r.lexvi),
  }));
  return {
    available: true,
    generated_at: typeof v.generated_at === "string" ? v.generated_at : "",
    source_file: typeof v.source_file === "string" ? v.source_file : "",
    model: typeof v.model === "string" ? v.model : "",
    n: typeof v.n === "number" ? v.n : summary.lexvi.dan_dieu_cu.n,
    summary,
    rows,
  };
}

export const benchmark: BenchmarkData | null = parseBenchmark(raw);
