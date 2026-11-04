import { jsonError, logStatus, metaConfig, requestId, sameOrigin } from "@/lib/server/meta";

/**
 * POST /api/transcribe — body: a mono 16-bit PCM WAV (16 or 24 kHz), as produced by
 * lib/audio/wav.ts. Forwards it to Muse Voice Transcribe's file endpoint
 * (https://dev.meta.ai/docs/speech-to-text) and returns { transcript, durationMs }.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

/** Nudge recognition toward tax vocabulary; the model may still spell differently. */
const KEYWORDS = [
  "thuế",
  "hộ kinh doanh",
  "hoá đơn điện tử",
  "doanh thu",
  "thuế giá trị gia tăng",
  "thuế thu nhập cá nhân",
  "kế toán",
  "cơ quan thuế",
];

function isWav(buf: Uint8Array): boolean {
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  return buf.length > 44 && tag(0) === "RIFF" && tag(8) === "WAVE";
}

export async function POST(req: Request): Promise<Response> {
  const rid = requestId();
  if (!sameOrigin(req)) return jsonError(403, "forbidden", rid);
  const cfg = metaConfig();
  if (!cfg) return jsonError(503, "not_configured", rid);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return jsonError(413, "too_large", rid);
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return jsonError(413, "too_large", rid);
  if (!isWav(buf)) return jsonError(400, "not_wav", rid);

  const form = new FormData();
  form.append(
    "request",
    new Blob(
      [
        JSON.stringify({
          mode: "PUSH_TO_TALK",
          model: "muse-voice-transcribe-1.0",
          audioEncoding: "WAV",
          languageBias: ["Vietnamese"],
          keywords: KEYWORDS,
        }),
      ],
      { type: "application/json" },
    ),
  );
  form.append("audio", new Blob([buf], { type: "audio/wav" }), "question.wav");

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/asr/transcribe?sessionId=lexvi-${rid}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    logStatus("transcribe", rid, 504);
    return jsonError(504, "upstream_unreachable", rid);
  }
  if (!res.ok) {
    logStatus("transcribe", rid, res.status, "upstream");
    const code =
      res.status === 429 ? "rate_limited" : res.status === 401 ? "bad_key" : "upstream_error";
    return jsonError(res.status === 429 ? 429 : 502, code, rid);
  }
  const data: unknown = await res.json().catch(() => null);
  const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const transcript = typeof obj.transcript === "string" ? obj.transcript.trim().slice(0, 2000) : "";
  const durationMs = typeof obj.audioDurationMs === "number" ? obj.audioDurationMs : 0;
  logStatus("transcribe", rid, 200, `${Math.round(durationMs / 1000)}s`);
  if (!transcript) return jsonError(422, "no_speech", rid);
  return Response.json({ transcript, durationMs }, { headers: { "x-request-id": rid } });
}
