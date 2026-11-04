/**
 * Adapter from the backend as built (Tuan Anh's FastAPI, lexvi/agent.py + tools.py + verify.py,
 * commit 7b71ce0) to the UI's view models. Everything here is pure and treats input as untrusted.
 *
 * The backend reports statuses and verification problems as Vietnamese sentences, so parts of
 * this adapter match on that wording (see verify.py and store.py). Structured fields were
 * requested from role B; until then, keep these patterns in sync with those files.
 */

import { isIsoDate } from "../format";
import { citationStatus } from "../legal-status";
import type {
  AskResponseMoRong,
  AskResult,
  BuocKiemChung,
  ChecklistItem,
  ChiTietDieuKhoan,
  CitationView,
  IsoDate,
  LanKiemChung,
  LoaiQuanHe,
  MaKiemChung,
  QuanHe,
  RunMeta,
  TrangThai,
  TrichDan,
} from "./contract";
import { arr, isObj, num, str, strOrNull } from "./util";

export class AdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdapterError";
  }
}

const RELATIONS = new Set<LoaiQuanHe>(["sua_doi", "thay_the", "bai_bo", "huong_dan", "dan_chieu"]);

/* ── Status from store.status().reason ─────────────────────────────────────────────────────── */

/**
 * store.py reasons: "đang có hiệu lực" · "{so} chỉ có hiệu lực từ {d}" · "{so} hết hiệu lực từ {d}" ·
 * "đã bị {loai, …} bởi {ids}" · "không có điều khoản {id} trong kho" ·
 * "chưa ban hành tại thời điểm …" · "bản OCR chưa được đối chiếu" ·
 * "… đã được sửa đổi bởi {ids} (đọc kèm {ids})".
 * The amended-but-read-along wording maps to da_sua_doi; it stays citable when the answer also
 * cites the amender (legal-status.ts isCitedWithAmender).
 */
export function statusFromTinhTrang(text: string): TrangThai | undefined {
  const t = text.toLowerCase();
  if (!t) return undefined;
  if (t.includes("chưa ban hành tại thời điểm") || t.includes("bản ocr chưa được đối chiếu"))
    return "can_xac_nhan";
  if (t.includes("đã được sửa đổi bởi") || t.includes("đọc kèm")) return "da_sua_doi";
  if (t.includes("đang có hiệu lực")) return "con_hieu_luc";
  if (t.includes("đã bị")) {
    if (t.includes("bai_bo")) return "het_hieu_luc";
    if (t.includes("sua_doi") || t.includes("thay_the")) return "da_sua_doi";
  }
  if (t.includes("hết hiệu lực")) return "het_hieu_luc";
  if (t.includes("chỉ có hiệu lực từ") || t.includes("không có điều khoản")) return "can_xac_nhan";
  return undefined;
}

/* ── Verification attempts from GET /runs/{run_id} ─────────────────────────────────────────── */

/**
 * Model-judge refusals (verify.py). Tested first: their text quotes article wording, which can
 * contain the code-check phrases below.
 */
const JUDGE_RULE =
  /điều khoản không ủng hộ nhận định|chưa được kiểm, hãy nộp lại|^Câu trả lời hoặc checklist không khớp điều khoản:/i;

/** verify.py code-check wording → the check it belongs to. */
const CODE_RULES: [RegExp, MaKiemChung][] = [
  [
    /không có điều khoản|không có trích dẫn nào|câu trả lời trống|phải là một điều khoản đã trích dẫn/i,
    "ton_tai",
  ],
  [/không áp dụng ngày/i, "con_hieu_luc"],
  [
    /nguyên văn|quá ngắn|thiếu nhận định|không định vị được câu trích|số trang không chứa câu trích/i,
    "khop_nguyen_van",
  ],
];
/** Per-citation problems start "Trích dẫn N (…)"; the rest of the sentence names the check. */
const CITATION_PREFIX = /^Trích dẫn \d+ \(/;
const CODE_STEPS: MaKiemChung[] = ["ton_tai", "con_hieu_luc", "khop_nguyen_van"];

function stepFor(problem: string): MaKiemChung | "judge" | null {
  if (JUDGE_RULE.test(problem)) return "judge";
  // Anchored: after a "Trích dẫn N (id): " prefix, match only the check's own phrase (up to the
  // next colon), so the store's status reason quoted after it cannot trigger another rule.
  let body = problem;
  if (CITATION_PREFIX.test(problem)) {
    const close = problem.indexOf("):");
    if (close >= 0) body = problem.slice(close + 2).split(":")[0];
  }
  for (const [re, ma] of CODE_RULES) if (re.test(body)) return ma;
  return null;
}

/**
 * One submit attempt → the four checks. verify.py runs every code check, then the model judge
 * only if all code checks passed; so the judge step is recorded only in that case.
 */
export function attemptFrom(lan_thu: number, passed: boolean, problems: string[]): LanKiemChung {
  if (passed) {
    return {
      lan_thu,
      buoc: [...CODE_STEPS, "mo_hinh_danh_gia" as const].map((ma) => ({ ma, dat: true })),
    };
  }
  const byStep = new Map<MaKiemChung, string[]>();
  const judge: string[] = [];
  const other: string[] = [];
  for (const p of problems) {
    const ma = stepFor(p);
    if (ma === "judge") judge.push(p);
    else if (ma) byStep.set(ma, [...(byStep.get(ma) ?? []), p]);
    else other.push(p);
  }
  const codeFailed = byStep.size > 0;
  const buoc: BuocKiemChung[] = CODE_STEPS.map((ma) => {
    const ps = byStep.get(ma);
    return ps ? { ma, dat: false, ly_do: ps.join(" ") } : { ma, dat: true };
  });
  if (codeFailed) {
    // Anything unmatched still gets shown, attached to the first failing check. (The judge only
    // runs when every code check passes, so judge wording here is unexpected; keep it visible.)
    other.push(...judge);
    if (other.length) {
      const first = buoc.find((b) => !b.dat);
      if (first) first.ly_do = [first.ly_do, ...other].filter(Boolean).join(" ");
    }
    return { lan_thu, buoc };
  }
  // All code checks passed, so the refusal came from the model judge.
  buoc.push({
    ma: "mo_hinh_danh_gia",
    dat: false,
    ly_do: [...judge, ...other].join(" ") || undefined,
  });
  return { lan_thu, buoc };
}

export interface RunRecord {
  steps: { tool?: string; args?: unknown; result?: unknown }[];
  output?: Record<string, unknown>;
}

export function parseRun(raw: unknown): RunRecord | null {
  if (!isObj(raw)) return null;
  return {
    steps: arr(raw.steps)
      .filter(isObj)
      .map((s) => ({
        tool: typeof s.tool === "string" ? s.tool : undefined,
        args: s.args,
        result: s.result,
      })),
    output: isObj(raw.output) ? raw.output : undefined,
  };
}

/**
 * Every nop_cau_tra_loi call in the run, as a verification attempt. Empty when none. Submits
 * that crashed (an `error` and no `van_de`) were never checked, so they are not attempts.
 */
export function attemptsFromRun(run: RunRecord, unresolved: string[]): LanKiemChung[] {
  const submits = run.steps.filter((s) => {
    if (s.tool !== "nop_cau_tra_loi") return false;
    const r = isObj(s.result) ? s.result : {};
    return !(r.error !== undefined && r.error !== null && !Array.isArray(r.van_de));
  });
  return submits.map((s, i) => {
    const r = isObj(s.result) ? s.result : {};
    if (r.status === "answered") return attemptFrom(i + 1, true, []);
    // The third refusal returns {status: "needs_review"}; its problems are in the output.
    const problems =
      r.status === "needs_review"
        ? unresolved
        : arr(r.van_de).filter((p): p is string => typeof p === "string");
    return attemptFrom(i + 1, false, problems);
  });
}

/** Full article text etc. from the run's doc_dieu_khoan results, keyed by provision id. */
function readsFromRun(run: RunRecord | null): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  for (const s of run?.steps ?? []) {
    if (s.tool !== "doc_dieu_khoan" || !isObj(s.result) || typeof s.result.id !== "string")
      continue;
    out.set(s.result.id, s.result);
  }
  return out;
}

/** "TEST-CU-D4-K1" → { dieu: "4", khoan: "1" } (build_corpus.py id format). */
export function articleFromId(id: string): { dieu?: string; khoan?: string } {
  const m = /-D([0-9]+[a-zđ]?)(?:-K([0-9]+[a-zđ]?))?$/i.exec(id);
  return m ? { dieu: m[1], khoan: m[2] } : {};
}

/** Relations, validated and de-duplicated (same from, to, type and date). */
export function parseRelations(v: unknown): QuanHe[] {
  const seen = new Set<string>();
  const out: QuanHe[] = [];
  for (const q of arr(v)) {
    if (!isObj(q) || typeof q.tu_id !== "string" || !RELATIONS.has(q.loai as LoaiQuanHe)) continue;
    const rel: QuanHe = {
      tu_id: q.tu_id,
      den_id: str(q.den_id),
      loai: q.loai as LoaiQuanHe,
      hieu_luc_tu: str(q.hieu_luc_tu),
    };
    if (isIsoDate(q.ngay_ban_hanh)) rel.ngay_ban_hanh = q.ngay_ban_hanh;
    if (typeof q.pham_vi === "string" && q.pham_vi) rel.pham_vi = q.pham_vi.slice(0, 300);
    if (typeof q.hoi_to === "boolean") rel.hoi_to = q.hoi_to;
    const key = `${rel.tu_id}|${rel.den_id}|${rel.loai}|${rel.hieu_luc_tu}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rel);
  }
  return out;
}

/** `vi_tri_nguon: [{trang, trang_nguon, nguon_pdf}]` → the first location, validated. */
function sourceLocation(v: unknown): { nguon_pdf?: string; trang_nguon?: number } {
  const first = arr(v).find(isObj);
  if (!first) return {};
  const pdf = typeof first.nguon_pdf === "string" ? first.nguon_pdf : "";
  return {
    nguon_pdf: /^https?:\/\//i.test(pdf) ? pdf : undefined,
    trang_nguon:
      typeof first.trang_nguon === "number" && first.trang_nguon > 0
        ? first.trang_nguon
        : undefined,
  };
}

function isoOrUndefined(v: unknown): IsoDate | undefined {
  return isIsoDate(v) ? v : undefined;
}

/* ── POST /ask (+ run) → AskResult ─────────────────────────────────────────────────────────── */

export function adaptAsk(raw: unknown, runRaw: unknown): AskResult {
  if (!isObj(raw) || typeof raw.tra_loi !== "string") {
    throw new AdapterError("/ask: response is missing tra_loi");
  }
  const run = parseRun(runRaw);
  const reads = readsFromRun(run);
  const unresolved = arr(raw.van_de_chua_giai_quyet).filter(
    (p): p is string => typeof p === "string",
  );

  const views: CitationView[] = [];
  const trich_dan: TrichDan[] = [];
  for (const c of arr(raw.trich_dan)) {
    if (!isObj(c) || typeof c.id !== "string") continue;
    const id = c.id;
    const read = reads.get(id);
    const tinh = str(c.tinh_trang);
    const fromRead = read
      ? { dieu: strOrNull(read.dieu) ?? undefined, khoan: strOrNull(read.khoan) ?? undefined }
      : {};
    const art = fromRead.dieu ? fromRead : articleFromId(id);
    trich_dan.push({ id, cau_trich: str(c.cau_trich), trang: num(c.trang) });
    const loc = sourceLocation(c.vi_tri_nguon ?? read?.vi_tri_nguon);
    // Newer backend: grouped relations; older: chuoi_sua_doi only (relations acting on it).
    const amendedBy = c.bi_sua_doi_boi !== undefined ? parseRelations(c.bi_sua_doi_boi) : undefined;
    const view: CitationView = {
      id,
      cau_trich: str(c.cau_trich),
      trang: num(c.trang, num(read?.trang)),
      nhan_dinh: strOrNull(c.nhan_dinh) ?? undefined,
      so_hieu: strOrNull(c.so_hieu) ?? (read ? (strOrNull(read.van_ban) ?? undefined) : undefined),
      tieu_de:
        strOrNull(c.ten_van_ban) ?? (read ? (strOrNull(read.ten_van_ban) ?? undefined) : undefined),
      nguon_url:
        strOrNull(c.nguon_url) ?? (read ? (strOrNull(read.nguon_url) ?? undefined) : undefined),
      ngay_ban_hanh: isoOrUndefined(c.ngay_ban_hanh),
      hieu_luc_tu: isoOrUndefined(c.hieu_luc_tu),
      dieu: art.dieu,
      khoan: art.khoan,
      noi_dung: read ? (strOrNull(read.noi_dung) ?? undefined) : undefined,
      trang_thai: statusFromTinhTrang(tinh),
      tinh_trang_text: tinh || undefined,
      quan_he: amendedBy ?? parseRelations(c.chuoi_sua_doi),
    };
    if (c.het_hieu_luc === null || isIsoDate(c.het_hieu_luc)) view.het_hieu_luc = c.het_hieu_luc;
    if (loc.nguon_pdf) view.nguon_pdf = loc.nguon_pdf;
    if (loc.trang_nguon) view.trang_nguon = loc.trang_nguon;
    if (c.sua_doi_toi !== undefined) view.sua_doi_toi = parseRelations(c.sua_doi_toi);
    if (c.dan_chieu !== undefined) view.dan_chieu = parseRelations(c.dan_chieu);
    views.push(view);
  }

  const checklist: ChecklistItem[] = arr(raw.checklist)
    .filter((t): t is Record<string, unknown> => isObj(t) && typeof t.viec === "string")
    .map((t) => ({ viec: str(t.viec), han: str(t.han), can_cu: str(t.can_cu) }));

  const attempts = run ? attemptsFromRun(run, unresolved) : [];
  const response: AskResponseMoRong = {
    tra_loi: raw.tra_loi,
    trich_dan,
    checklist,
    // Anything other than an explicit false — or an answer without citations — needs confirmation.
    can_xac_nhan: raw.can_xac_nhan !== false || trich_dan.length === 0,
    kiem_chung: attempts.length ? attempts : undefined,
  };
  const meta: RunMeta = {
    run_id: strOrNull(raw.run_id) ?? undefined,
    trang_thai: strOrNull(raw.trang_thai) ?? undefined,
    so_luot: typeof raw.so_luot === "number" ? raw.so_luot : undefined,
    thoi_gian_giay: typeof raw.thoi_gian_giay === "number" ? raw.thoi_gian_giay : undefined,
    van_de: unresolved.length ? unresolved : undefined,
  };
  return { response, views, meta };
}

/* ── Mock → AskResult (same shape, full chains) ────────────────────────────────────────────── */

export function viewFromDetail(
  t: TrichDan,
  d: ChiTietDieuKhoan | null,
  applied: IsoDate,
): CitationView {
  if (!d) return { id: t.id, cau_trich: t.cau_trich, trang: t.trang };
  const vb = d.van_ban;
  return {
    id: t.id,
    cau_trich: t.cau_trich,
    trang: t.trang,
    so_hieu: vb.so_hieu,
    loai: vb.loai,
    tieu_de: vb.tieu_de,
    ngay_ban_hanh: vb.ngay_ban_hanh,
    hieu_luc_tu: vb.hieu_luc_tu,
    het_hieu_luc: vb.het_hieu_luc,
    nguon_url: vb.nguon_url,
    nguon_pdf: d.dieu_khoan.nguon_pdf,
    trang_nguon: d.dieu_khoan.trang_nguon,
    dieu: String(d.dieu_khoan.dieu),
    khoan: d.dieu_khoan.khoan === null ? undefined : String(d.dieu_khoan.khoan),
    noi_dung: d.dieu_khoan.noi_dung,
    trang_thai: citationStatus(vb.so_hieu, d.chuoi, applied),
    chuoi: d.chuoi,
  };
}

export function mockResult(
  response: AskResponseMoRong,
  detail: (id: string) => ChiTietDieuKhoan | null,
  applied: IsoDate,
): AskResult {
  const views = response.trich_dan.map((t) => viewFromDetail(t, detail(t.id), applied));
  return { response, views, meta: {} };
}
