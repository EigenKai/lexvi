import type {
  AskRequest,
  AskResponseMoRong,
  ChecklistItem,
  ChiTietDieuKhoan,
  DieuBiAnhHuong,
  HoSo,
  IngestResponse,
  LanKiemChung,
  ThayDoi,
  TrichDan,
} from "./contract";
import { type MockScenario, mockAsk, mockDetail, mockIngest, pickScenario } from "./mock";

/**
 * When NEXT_PUBLIC_LEXVI_API_URL is set, calls role B's backend; otherwise returns the typed
 * mocks (lib/api/mock.ts) and the UI shows the "Dữ liệu minh hoạ" flag.
 * NEXT_PUBLIC_* values are inlined at build time: changing them needs a restart / rebuild.
 * The backend must allow this origin via CORS (JSON POST → preflight OPTIONS).
 */
const API_URL = process.env.NEXT_PUBLIC_LEXVI_API_URL?.trim().replace(/\/+$/, "") || null;
const TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_LEXVI_API_TIMEOUT_MS) || 60_000;

export const usingMock = API_URL === null;

export interface ClientOptions {
  latencyMs: number;
  scenario: MockScenario | null;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Caller's signal + a timeout. A timeout surfaces as TimeoutError, not AbortError. */
function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * The backend response is untrusted (model output). Validate the shape, drop malformed items,
 * default missing arrays, and treat anything doubtful as needing confirmation.
 */
export function parseAskResponse(raw: unknown): AskResponseMoRong {
  if (!isObj(raw) || typeof raw.tra_loi !== "string") {
    throw new ApiError("/ask: response is missing tra_loi");
  }
  const trich_dan: TrichDan[] = (Array.isArray(raw.trich_dan) ? raw.trich_dan : [])
    .filter((t): t is Record<string, unknown> => isObj(t) && typeof t.id === "string")
    .map((t) => ({ id: str(t.id), cau_trich: str(t.cau_trich), trang: num(t.trang) }));
  const checklist: ChecklistItem[] = (Array.isArray(raw.checklist) ? raw.checklist : [])
    .filter(
      (c): c is Record<string, unknown> =>
        isObj(c) && typeof c.viec === "string" && typeof c.han === "string",
    )
    .map((c) => ({ viec: str(c.viec), han: str(c.han), can_cu: str(c.can_cu) }));
  const kiem_chung: LanKiemChung[] | undefined = Array.isArray(raw.kiem_chung)
    ? raw.kiem_chung.filter(isObj).map((a, i) => ({
        lan_thu: num(a.lan_thu, i + 1),
        buoc: (Array.isArray(a.buoc) ? a.buoc : []).filter(isObj).map((b) => ({
          ma: str(b.ma) as LanKiemChung["buoc"][number]["ma"],
          dat: b.dat === true,
          ly_do: typeof b.ly_do === "string" ? b.ly_do : undefined,
        })),
      }))
    : undefined;
  return {
    tra_loi: raw.tra_loi,
    trich_dan,
    checklist,
    // Anything other than an explicit false means "needs confirmation".
    can_xac_nhan: raw.can_xac_nhan !== false || trich_dan.length === 0,
    kiem_chung,
  };
}

export async function ask(req: AskRequest, opts: ClientOptions): Promise<AskResponseMoRong> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: withTimeout(opts.signal),
    });
    if (!res.ok) {
      // Bounded diagnostics only (status + request id), never the response body.
      const requestId = res.headers.get("x-request-id");
      console.warn(`/ask failed: ${res.status}${requestId ? ` (request ${requestId})` : ""}`);
      throw new ApiError(`/ask ${res.status}`, res.status);
    }
    return parseAskResponse(await res.json());
  }
  await wait(opts.latencyMs, opts.signal);
  return mockAsk(req, opts.scenario ?? pickScenario(req.cau_hoi));
}

/** Proposed endpoint (not in the contract yet): GET /dieu-khoan/{id}. Null when unavailable. */
export async function getCitationDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ChiTietDieuKhoan | null> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/dieu-khoan/${encodeURIComponent(id)}`, {
        signal: withTimeout(signal),
      });
      if (!res.ok) return null;
      const raw: unknown = await res.json();
      // Minimal shape check; the drawer degrades gracefully if this returns null.
      if (
        !isObj(raw) ||
        !isObj(raw.dieu_khoan) ||
        !isObj(raw.van_ban) ||
        !Array.isArray(raw.chuoi)
      ) {
        return null;
      }
      return raw as unknown as ChiTietDieuKhoan;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      return null;
    }
  }
  return mockDetail(id);
}

/* ── POST /ingest ───────────────────────────────────────────────────────────────────────────── */

const LOAI_THAY_DOI = new Set(["sua_doi", "thay_the", "bai_bo", "huong_dan"]);
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

function parseChange(c: Record<string, unknown>): ThayDoi | null {
  if (typeof c.trich_doan !== "string" || typeof c.dieu_bi_tac_dong !== "string") return null;
  return {
    trich_doan: c.trich_doan,
    loai: (LOAI_THAY_DOI.has(str(c.loai)) ? c.loai : "sua_doi") as ThayDoi["loai"],
    dieu_bi_tac_dong: c.dieu_bi_tac_dong,
    anh_huong_toi_ho_so: c.anh_huong_toi_ho_so === true,
    giai_thich: str(c.giai_thich),
    viec_can_lam: str(c.viec_can_lam),
    han: str(c.han),
  };
}

/** Untrusted (model output): validate, drop malformed rows, default arrays. */
export function parseIngestResponse(raw: unknown): IngestResponse {
  if (!isObj(raw) || !isObj(raw.van_ban_moi)) throw new ApiError("/ingest: missing van_ban_moi");
  const vb = raw.van_ban_moi;
  const affected: DieuBiAnhHuong[] = (
    Array.isArray(raw.dieu_bi_anh_huong) ? raw.dieu_bi_anh_huong : []
  )
    .filter(isObj)
    .flatMap((c) => {
      const base = parseChange(c);
      const old = isObj(c.dieu_cu) ? c.dieu_cu : null;
      if (!base || !old || typeof old.noi_dung !== "string") return [];
      return [
        {
          ...base,
          dieu_cu: { id: str(old.id), so_hieu: str(old.so_hieu), noi_dung: old.noi_dung },
        },
      ];
    });
  const tasks = (Array.isArray(raw.viec_can_lam) ? raw.viec_can_lam : [])
    .filter((v): v is Record<string, unknown> => isObj(v) && typeof v.viec === "string")
    .map((v) => ({
      viec: str(v.viec),
      han: str(v.han),
      can_cu: str(v.can_cu),
      trich_doan: str(v.trich_doan),
    }));
  const dropped = (Array.isArray(raw.bi_loai) ? raw.bi_loai : []).filter(isObj).flatMap((c) => {
    const base = parseChange(c);
    return base ? [{ ...base, ly_do: str(c.ly_do) }] : [];
  });
  return {
    van_ban_moi: {
      so_hieu: str(vb.so_hieu),
      tieu_de: str(vb.tieu_de),
      hieu_luc_tu: str(vb.hieu_luc_tu),
    },
    dieu_bi_anh_huong: affected,
    viec_can_lam: tasks,
    bi_loai: dropped,
    can_xac_nhan: true,
  };
}

/**
 * Send a new legal PDF for analysis. In mock mode `file` may be null (the sample document);
 * against the real backend a PDF is required.
 */
export async function ingest(
  file: File | null,
  hoSo: HoSo,
  opts: { latencyMs: number; signal?: AbortSignal },
): Promise<IngestResponse> {
  if (API_URL) {
    if (!file) throw new ApiError("needs-file");
    const body = new FormData();
    body.append("pdf", file);
    body.append("ho_so", JSON.stringify(hoSo));
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      body,
      signal: withTimeout(opts.signal),
    });
    if (!res.ok) {
      const requestId = res.headers.get("x-request-id");
      console.warn(`/ingest failed: ${res.status}${requestId ? ` (request ${requestId})` : ""}`);
      // FastAPI puts a short, user-facing Vietnamese reason in `detail` for 400/422.
      let detail = "";
      try {
        const j: unknown = await res.json();
        if (isObj(j) && typeof j.detail === "string") detail = j.detail.slice(0, 200);
      } catch {
        // no JSON body
      }
      throw new ApiError(detail || `/ingest ${res.status}`, res.status);
    }
    return parseIngestResponse(await res.json());
  }
  await wait(opts.latencyMs, opts.signal);
  return mockIngest(hoSo);
}
