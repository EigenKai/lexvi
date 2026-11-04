/**
 * Server-only helpers for calling the Meta Model API from Next.js route handlers.
 * Imported only by app/api/** routes; never import this from a client component.
 *
 * Env (web/.env.local, never NEXT_PUBLIC_):
 *   MODEL_API_KEY       required — the Meta Model API key
 *   MODEL_API_BASE_URL  optional — default https://api.meta.ai/v1
 *   MODEL_API_MODEL     optional — default muse-spark-1.3 (never the -contributor tier)
 */

/** Values copied with a trailing "  # comment" keep it in some loaders; strip it defensively. */
function clean(v: string | undefined): string {
  return (v ?? "").split(/\s+#/)[0].trim();
}

export interface MetaConfig {
  key: string;
  baseUrl: string;
  model: string;
}

export function metaConfig(): MetaConfig | null {
  const key = clean(process.env.MODEL_API_KEY);
  if (!key) return null;
  return {
    key,
    baseUrl: (clean(process.env.MODEL_API_BASE_URL) || "https://api.meta.ai/v1").replace(
      /\/+$/,
      "",
    ),
    model: clean(process.env.MODEL_API_MODEL) || "muse-spark-1.3",
  };
}

/** Short random id to correlate a request in logs without logging its content. */
export function requestId(): string {
  return Math.random().toString(16).slice(2, 10);
}

/**
 * These routes spend API credits, so only this app's own pages may call them: a browser request
 * from another origin carries a foreign Origin header and is refused.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / server-to-server
  try {
    return new URL(origin).host === new URL(req.url).host || origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export function jsonError(status: number, error: string, rid: string): Response {
  return Response.json({ error }, { status, headers: { "x-request-id": rid } });
}

/** Bounded diagnostics only: id, route, status — never audio, images or text. */
export function logStatus(route: string, rid: string, status: number, note = ""): void {
  console.info(`[${route}] ${rid} ${status}${note ? ` ${note}` : ""}`);
}
