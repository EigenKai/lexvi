import { jsonError, logStatus, metaConfig, requestId, sameOrigin } from "@/lib/server/meta";

/**
 * POST /api/read-image — multipart field `image` (jpeg/png/webp). Muse Spark reads the photo
 * (https://dev.meta.ai/docs/image-understanding) and returns a short summary plus a drafted
 * question. It does NOT answer: the owner sends the question through the verified /ask.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 90_000;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const PROMPT = [
  "Đây là ảnh do chủ một hộ kinh doanh chụp (có thể là thông báo thuế, hoá đơn, tờ khai hoặc giấy tờ khác).",
  "Chỉ đọc những gì nhìn thấy trong ảnh. Không suy đoán, không trả lời câu hỏi về thuế, không đưa ra lời khuyên.",
  "Trả về JSON:",
  "- la_giay_to_thue: true nếu đây là giấy tờ liên quan đến thuế, hoá đơn hoặc kê khai; ngược lại false.",
  "- loai_giay_to: tên ngắn của loại giấy tờ, tiếng Việt (ví dụ: Thông báo nộp thuế, Hoá đơn bán hàng).",
  "- tom_tat: tối đa 2 câu tiếng Việt, nêu số tiền, kỳ thuế, hạn nộp nếu có trên giấy.",
  "- ngay_tren_giay: ngày quan trọng nhất trên giấy (hạn nộp, ngày lập) dạng YYYY-MM-DD, hoặc chuỗi rỗng.",
  "- cau_hoi_goi_y: một câu hỏi ngắn bằng tiếng Việt mà chủ quán có thể hỏi về giấy tờ này.",
  "  Không đưa tên người, mã số thuế, số điện thoại, địa chỉ hay số tài khoản vào câu hỏi.",
].join("\n");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    la_giay_to_thue: { type: "boolean" },
    loai_giay_to: { type: "string" },
    tom_tat: { type: "string" },
    ngay_tren_giay: { type: "string" },
    cau_hoi_goi_y: { type: "string" },
  },
  required: ["la_giay_to_thue", "loai_giay_to", "tom_tat", "ngay_tren_giay", "cau_hoi_goi_y"],
};

/** Raw Responses API JSON → the model's output text. */
function outputText(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";
  const d = data as Record<string, unknown>;
  if (typeof d.output_text === "string") return d.output_text;
  const parts: string[] = [];
  for (const item of Array.isArray(d.output) ? d.output : []) {
    const content = (item as Record<string, unknown>)?.content;
    for (const c of Array.isArray(content) ? content : []) {
      const cc = c as Record<string, unknown>;
      if (cc?.type === "output_text" && typeof cc.text === "string") parts.push(cc.text);
    }
  }
  return parts.join("");
}

const cap = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request): Promise<Response> {
  const rid = requestId();
  if (!sameOrigin(req)) return jsonError(403, "forbidden", rid);
  const cfg = metaConfig();
  if (!cfg) return jsonError(503, "not_configured", rid);

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("image");
    file = f instanceof File ? f : null;
  } catch {
    return jsonError(400, "bad_form", rid);
  }
  if (!file) return jsonError(400, "no_image", rid);
  if (!TYPES.has(file.type)) return jsonError(415, "unsupported_type", rid);
  if (file.size > MAX_BYTES) return jsonError(413, "too_large", rid);

  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        input: [
          {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              { type: "input_image", image_url: dataUrl },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "doc_tu_anh", schema: SCHEMA, strict: true } },
        reasoning: { effort: "low" },
        max_output_tokens: 2000,
        store: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    logStatus("read-image", rid, 504);
    return jsonError(504, "upstream_unreachable", rid);
  }
  if (!res.ok) {
    logStatus("read-image", rid, res.status, "upstream");
    const code =
      res.status === 429 ? "rate_limited" : res.status === 401 ? "bad_key" : "upstream_error";
    return jsonError(res.status === 429 ? 429 : 502, code, rid);
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(outputText(await res.json())) as Record<string, unknown>;
  } catch {
    logStatus("read-image", rid, 502, "unparseable");
    return jsonError(502, "unreadable_output", rid);
  }
  // Model output is untrusted: keep only the expected fields, typed and length-capped.
  const date = cap(parsed.ngay_tren_giay, 10);
  const out = {
    la_giay_to_thue: parsed.la_giay_to_thue === true,
    loai_giay_to: cap(parsed.loai_giay_to, 80),
    tom_tat: cap(parsed.tom_tat, 400),
    ngay_tren_giay: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    cau_hoi_goi_y: cap(parsed.cau_hoi_goi_y, 300),
  };
  logStatus("read-image", rid, 200);
  return Response.json(out, { headers: { "x-request-id": rid } });
}
