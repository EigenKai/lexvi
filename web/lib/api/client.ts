import { isIsoDate } from "../format";
import { adaptAsk, mockResult } from "./adapter";
import type {
  AskRequest,
  AskResult,
  DieuBiAnhHuong,
  HoSo,
  IngestResponse,
  ThayDoi,
} from "./contract";
import {
  type MockLang,
  type MockScenario,
  mockAsk,
  mockDetail,
  mockIngest,
  pickScenario,
} from "./mock";
import { isObj, str } from "./util";

/**
 * When NEXT_PUBLIC_LEXVI_API_URL is set, calls role B's backend; otherwise returns the typed
 * mocks (lib/api/mock.ts) and the UI shows the "Dữ liệu minh hoạ" flag.
 * NEXT_PUBLIC_* values are inlined at build time: changing them needs a restart / rebuild.
 * The backend must allow this origin via CORS (JSON POST → preflight OPTIONS).
 */
const API_URL = process.env.NEXT_PUBLIC_LEXVI_API_URL?.trim().replace(/\/+$/, "") || null;
// The real /ask takes 45–110 s (102 s measured on the free Render instance) and /ingest ~60 s;
// the default leaves headroom for a long run.
const TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_LEXVI_API_TIMEOUT_MS) || 240_000;

export const usingMock = API_URL === null;

export interface ClientOptions {
  latencyMs: number;
  scenario: MockScenario | null;
  /** Language of the prepared (mock) prose; the real API ignores it. Default "vi". */
  lang?: MockLang;
  signal?: AbortSignal;
}

/**
 * What went wrong, as a code the screens map to i18n messages. Never shown raw:
 * - needs-file: the real backend needs a PDF;
 * - http: the server answered with an error status (`status`);
 * - bad-response: the body was not the expected shape.
 */
export type ApiErrorCode = "needs-file" | "http" | "bad-response";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status?: number,
  ) {
    super(status ? `${code} ${status}` : code);
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

/* ── Waking the live backend ────────────────────────────────────────────────────────────────── */

/**
 * The live backend runs on a free instance that sleeps when idle and takes about a minute to wake.
 * A scheduled ping keeps it warm, but a missed ping or a redeploy can still leave it asleep. So
 * before the first call, poll /health until it answers {ok:true}; LiveBanner shows the state.
 */
export type BackendState = "idle" | "waking" | "ready" | "down";
const WAKE_LIMIT_MS = 180_000;
let backend: BackendState = "idle";
let waking: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function setBackend(next: BackendState) {
  backend = next;
  for (const fn of listeners) fn();
}

export function backendState(): BackendState {
  return backend;
}

export function subscribeBackend(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Resolves true once /health answers ok (at once in mock mode), false after WAKE_LIMIT_MS. */
export function wakeBackend(): Promise<boolean> {
  if (!API_URL || backend === "ready") return Promise.resolve(true);
  if (!waking) {
    const base = API_URL;
    waking = (async () => {
      const started = Date.now();
      for (let attempt = 0; Date.now() - started < WAKE_LIMIT_MS; attempt++) {
        try {
          const res = await fetch(`${base}/health`, {
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
          });
          const j: unknown = res.ok ? await res.json() : null;
          if (isObj(j) && j.ok === true) {
            setBackend("ready");
            return true;
          }
        } catch {
          // Asleep: the host's wake-up page has no CORS headers, so fetch fails. Try again.
        }
        if (attempt === 0) setBackend("waking");
        await wait(3000);
      }
      setBackend("down");
      return false;
    })().finally(() => {
      waking = null;
    });
  }
  return waking;
}

/** Wait for the backend before a call, honouring the caller's abort. */
async function backendReady(signal?: AbortSignal): Promise<void> {
  const ok = await wakeBackend();
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  if (!ok) throw new ApiError("http", 503);
}

/** fetch, but a network failure (the server went away) becomes a 503 and re-arms the wake-up. */
async function callBackend(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const name = (err as Error).name;
    if (name === "AbortError" || name === "TimeoutError") throw err;
    if (backend === "ready") setBackend("idle");
    throw new ApiError("http", 503);
  }
}

/**
 * POST /ask, then GET /runs/{run_id} for the verification steps and the article texts the agent
 * read (best effort: without the run the UI shows the final state only). Mock mode returns the
 * same AskResult shape, so the screens have one code path.
 */
export async function ask(req: AskRequest, opts: ClientOptions): Promise<AskResult> {
  if (API_URL) {
    await backendReady(opts.signal);
    const res = await callBackend(`${API_URL}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: withTimeout(opts.signal),
    });
    if (!res.ok) {
      // Bounded diagnostics only (status + request id), never the response body.
      const requestId = res.headers.get("x-request-id");
      console.warn(`/ask failed: ${res.status}${requestId ? ` (request ${requestId})` : ""}`);
      throw new ApiError("http", res.status);
    }
    const raw: unknown = await res.json().catch(() => {
      throw new ApiError("bad-response");
    });
    const runId = isObj(raw) && typeof raw.run_id === "string" ? raw.run_id : null;
    let run: unknown = null;
    if (runId && /^[0-9a-f]{12}$/.test(runId)) {
      try {
        const r = await fetch(`${API_URL}/runs/${runId}`, { signal: withTimeout(opts.signal) });
        if (r.ok) run = await r.json();
      } catch (err) {
        if ((err as Error).name === "AbortError") throw err;
      }
    }
    return adaptAsk(raw, run);
  }
  await wait(opts.latencyMs, opts.signal);
  const response = mockAsk(req, opts.scenario ?? pickScenario(req.cau_hoi), opts.lang);
  return mockResult(response, mockDetail, req.ngay_ap_dung);
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
  if (!isObj(raw) || !isObj(raw.van_ban_moi)) throw new ApiError("bad-response");
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
      ...(isIsoDate(vb.ngay_ban_hanh) ? { ngay_ban_hanh: vb.ngay_ban_hanh } : {}),
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
  opts: { latencyMs: number; signal?: AbortSignal; lang?: MockLang },
): Promise<IngestResponse> {
  if (API_URL) {
    if (!file) throw new ApiError("needs-file");
    if (file.size > MAX_PDF_BYTES) throw new ApiError("http", 413);
    await backendReady(opts.signal);
    const body = new FormData();
    body.append("pdf", file);
    body.append("ho_so", JSON.stringify(hoSo));
    const res = await callBackend(`${API_URL}/ingest`, {
      method: "POST",
      body,
      signal: withTimeout(opts.signal),
    });
    if (!res.ok) {
      const requestId = res.headers.get("x-request-id");
      // FastAPI's `detail` is a developer-facing reason: log it (bounded), never show it raw.
      let detail = "";
      try {
        const j: unknown = await res.json();
        if (isObj(j) && typeof j.detail === "string") detail = j.detail.slice(0, 200);
      } catch {
        // no JSON body
      }
      console.warn(
        `/ingest failed: ${res.status}${requestId ? ` (request ${requestId})` : ""}${detail ? ` — ${detail}` : ""}`,
      );
      throw new ApiError("http", res.status);
    }
    const raw: unknown = await res.json().catch(() => {
      throw new ApiError("bad-response");
    });
    return parseIngestResponse(raw);
  }
  await wait(opts.latencyMs, opts.signal);
  return mockIngest(hoSo, opts.lang);
}

/* ── Voice and photo input (Next.js routes in this app; key stays server-side) ─────────────── */

export interface PhotoReading {
  la_giay_to_thue: boolean;
  loai_giay_to: string;
  tom_tat: string;
  /** "" or YYYY-MM-DD */
  ngay_tren_giay: string;
  cau_hoi_goi_y: string;
}

/** Error codes from app/api/transcribe and app/api/read-image (plus client-side ones). */
export type InputErrorCode =
  | "not_configured"
  | "no_speech"
  | "too_large"
  | "unsupported_type"
  | "rate_limited"
  | "mic_denied"
  | "mic_unavailable"
  | "failed";

export class InputError extends Error {
  constructor(readonly code: InputErrorCode) {
    super(code);
    this.name = "InputError";
  }
}

async function inputError(res: Response): Promise<InputError> {
  let code = "";
  try {
    const j: unknown = await res.json();
    if (isObj(j) && typeof j.error === "string") code = j.error;
  } catch {
    // no JSON body
  }
  const known: InputErrorCode[] = [
    "not_configured",
    "no_speech",
    "too_large",
    "unsupported_type",
    "rate_limited",
  ];
  return new InputError((known as string[]).includes(code) ? (code as InputErrorCode) : "failed");
}

/** WAV blob → transcript (Muse Voice Transcribe, Vietnamese-biased). */
export async function transcribe(wav: Blob, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "content-type": "audio/wav" },
    body: wav,
    signal,
  });
  if (!res.ok) throw await inputError(res);
  const j: unknown = await res.json();
  return isObj(j) ? str(j.transcript) : "";
}

/** Photo (already downscaled JPEG) → what Muse Spark read + a drafted question. */
export async function readImage(image: Blob, signal?: AbortSignal): Promise<PhotoReading> {
  const body = new FormData();
  body.append("image", image, "photo.jpg");
  const res = await fetch("/api/read-image", { method: "POST", body, signal });
  if (!res.ok) throw await inputError(res);
  const j: unknown = await res.json();
  if (!isObj(j)) throw new InputError("failed");
  return {
    la_giay_to_thue: j.la_giay_to_thue === true,
    loai_giay_to: str(j.loai_giay_to),
    tom_tat: str(j.tom_tat),
    ngay_tren_giay: isIsoDate(j.ngay_tren_giay) ? j.ngay_tren_giay : "",
    cau_hoi_goi_y: str(j.cau_hoi_goi_y),
  };
}
