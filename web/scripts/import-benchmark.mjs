#!/usr/bin/env node
/**
 * Copy the newest benchmark run into the web app.
 *
 *   pnpm benchmark:import                  # newest ../eval/results-*.json
 *   pnpm benchmark:import path/to/file.json
 *
 * Reads the backend's scripts/run_eval.py output and ../data/questions.json (for question text
 * and applied date) and writes lib/benchmark/results.json. Answer texts are not copied.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(web, "..");
const METRICS = ["dan_dieu_cu", "dung_can_cu", "trich_sai", "can_xac_nhan"];
// Optional summary keys (newer run_eval.py): crashes, no answer, invented provision ids.
const EXTRAS = ["loi", "khong_tra_loi", "id_bia"];

function newestResults() {
  const dir = join(repo, "eval");
  let files;
  try {
    files = readdirSync(dir).filter((f) => /^results-.*\.json$/.test(f));
  } catch {
    files = [];
  }
  if (files.length === 0) {
    console.error(
      `No results found in ${dir}. Run \`python -m scripts.run_eval\` in the repo root first.`,
    );
    process.exit(1);
  }
  return files
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

const src = process.argv[2] ? resolve(process.argv[2]) : newestResults();
const results = JSON.parse(readFileSync(src, "utf8"));
let questions = [];
try {
  questions = JSON.parse(readFileSync(join(repo, "data", "questions.json"), "utf8"));
} catch {
  console.warn("data/questions.json not readable; question texts will be empty.");
}

for (const sys of ["rag_thuong", "lexvi"]) {
  for (const m of METRICS) {
    if (!/^\d+\/\d+$/.test(String(results?.summary?.[sys]?.[m] ?? ""))) {
      console.error(
        `Unexpected summary format: summary.${sys}.${m} = ${results?.summary?.[sys]?.[m]}`,
      );
      process.exit(1);
    }
  }
}

const byQuestion = new Map();
for (const r of results.rows ?? []) {
  const q = questions[(r.cau ?? 0) - 1] ?? {};
  const row = byQuestion.get(r.cau) ?? {
    cau: r.cau,
    cau_hoi: q.cau_hoi ?? "",
    ngay_ap_dung: q.ngay_ap_dung ?? "",
    rag_thuong: {},
    lexvi: {},
  };
  row[r.he] = Object.fromEntries(METRICS.map((m) => [m, r[m] === true]));
  // A crashed run: keep the flag only, not the error text.
  if (r.loi === true || (typeof r.loi === "string" && r.loi !== "")) row[r.he].loi = true;
  byQuestion.set(r.cau, row);
}

const n = Number(String(results.summary.lexvi.dan_dieu_cu).split("/")[1]);
const stamp = /results-(\d{8})-(\d{4})/.exec(basename(src));
const out = {
  available: true,
  generated_at: stamp
    ? `${stamp[1].slice(0, 4)}-${stamp[1].slice(4, 6)}-${stamp[1].slice(6, 8)}`
    : new Date(statSync(src).mtimeMs).toISOString().slice(0, 10),
  source_file: basename(src),
  model:
    (typeof results.model === "string" && results.model) ||
    process.env.MODEL_API_MODEL ||
    "muse-spark-1.3",
  n,
  summary: Object.fromEntries(
    ["rag_thuong", "lexvi"].map((sys) => {
      const s = results.summary[sys];
      const keep = [...METRICS, ...EXTRAS].filter((k) => /^\d+\/\d+$/.test(String(s?.[k] ?? "")));
      return [sys, Object.fromEntries(keep.map((k) => [k, s[k]]))];
    }),
  ),
  rows: [...byQuestion.values()].sort((a, b) => a.cau - b.cau),
};
const dest = join(web, "lib", "benchmark", "results.json");
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${dest} from ${basename(src)} (N = ${n}).`);
