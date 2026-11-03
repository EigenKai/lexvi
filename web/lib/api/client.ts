import type {
  AskRequest,
  AskResponseMoRong,
  ChecklistItem,
  ChiTietDieuKhoan,
  LanKiemChung,
  TrichDan,
} from "./contract";
import { type MockScenario, mockAsk, mockDetail, pickScenario } from "./mock";

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
