// MOCK — prepared example responses for role B's `/ask` and `/ingest`, used by the demo film.
//
// Built from role A's corpus: every article text, page, PDF link and document date comes from
// `mock-corpus.json`, which `scripts/build-mock-corpus.mjs` extracts verbatim from ../data. Quotes
// are cut from those texts by `quoteFrom`, so they are always verbatim. The answers, checklists and
// verification attempts are written for the demo (paraphrase, not quotes) and are NOT live system
// output — the UI labels them as prepared examples (mockBadge / mockFlag).
// The ingest scenario follows role A's `demo/role_a/expected.json` (Decree 141/2026 replay).

import { compareIso, formatDate, formatVndWords, formatVndWordsEn } from "../format";
import type {
  AskRequest,
  AskResponseMoRong,
  ChiTietDieuKhoan,
  HoSo,
  IngestResponse,
  LanKiemChung,
  NutChuoi,
  VanBan,
} from "./contract";
import corpus from "./mock-corpus.json";

type CorpusDoc = (typeof corpus.van_ban)[keyof typeof corpus.van_ban];
type CorpusProv = {
  id: string;
  so_hieu: string;
  dieu: number;
  khoan: number | null;
  noi_dung: string;
  trang: number;
  trang_nguon?: number;
  nguon_pdf?: string;
  hieu_luc_tu: string;
  het_hieu_luc: string | null;
};

const DOCS = corpus.van_ban as Record<string, CorpusDoc>;
const PROVS = corpus.dieu_khoan as Record<string, CorpusProv>;

function doc(soHieu: string): VanBan {
  const d = DOCS[soHieu];
  if (!d) throw new Error(`mock document missing: ${soHieu}`);
  return { ...d, loai: d.loai as VanBan["loai"], het_hieu_luc: d.het_hieu_luc ?? null };
}
function prov(id: string): CorpusProv {
  const p = PROVS[id];
  if (!p) throw new Error(`mock provision missing: ${id}`);
  return p;
}

const VB = {
  tt40: doc("40/2021/TT-BTC"),
  tt18: doc("18/2026/TT-BTC"),
  l48: doc("48/2024/QH15"),
  l149: doc("149/2025/QH15"),
  l109: doc("109/2025/QH15"),
  l09: doc("09/2026/QH16"),
  nd68: doc("68/2026/NĐ-CP"),
  nd70: doc("70/2025/NĐ-CP"),
  nd141: doc("141/2026/NĐ-CP"),
};

/** A chain node. `ap_dung_tu` = the provision's own start date when it differs from the document's. */
function node(
  vb: VanBan,
  noi_dung_ngan: string,
  quan_he: NutChuoi["quan_he"],
  ap_dung_tu?: string,
): NutChuoi {
  const { so_hieu, loai, ngay_ban_hanh, hieu_luc_tu, het_hieu_luc } = vb;
  return {
    van_ban: { so_hieu, loai, ngay_ban_hanh, hieu_luc_tu, het_hieu_luc },
    noi_dung_ngan,
    quan_he,
    ...(ap_dung_tu && ap_dung_tu !== hieu_luc_tu ? { ap_dung_tu } : {}),
  };
}

// ── Chains (from the corpus edges in data/quan_he.json) ─────────────────────────────────────
// 40/2021 Art. 4(2) ← replaced by 18/2026 Art. 9(2) from 05/03/2026.
const CHAIN_TT40: NutChuoi[] = [
  node(VB.tt40, "≤ 100 triệu đồng/năm không phải nộp GTGT, TNCN", null),
  node(VB.tt18, "Thay thế Thông tư 40/2021/TT-BTC", "thay_the"),
];
// VAT Law 48/2024 Art. 5(25) (from 01/01/2026) ← 149/2025 Art. 1(1) ← 09/2026 Art. 2 (from 01/01/2026).
const CHAIN_VAT: NutChuoi[] = [
  node(
    VB.l48,
    "≤ 200 triệu đồng/năm không chịu GTGT",
    null,
    prov("48-2024-QH15-D5-K25").hieu_luc_tu,
  ),
  node(VB.l149, "≤ 500 triệu đồng/năm", "sua_doi"),
  node(
    VB.l09,
    "Mức doanh thu do Chính phủ quy định",
    "sua_doi",
    prov("09-2026-QH16-D2").hieu_luc_tu,
  ),
];
// PIT Law 109/2025 Art. 7(1) (from 01/01/2026) ← 09/2026 Art. 1 (from 01/01/2026).
const CHAIN_PIT: NutChuoi[] = [
  node(
    VB.l109,
    "≤ 500 triệu đồng/năm không phải nộp TNCN",
    null,
    prov("109-2025-QH15-D7-K1").hieu_luc_tu,
  ),
  node(
    VB.l09,
    "Mức doanh thu do Chính phủ quy định",
    "sua_doi",
    prov("09-2026-QH16-D1").hieu_luc_tu,
  ),
];
// Decree 68/2026 Arts. 3, 4, 8(1) ← Decree 141/2026 Art. 1(1): "500 triệu đồng" → "01 tỷ đồng".
const CHAIN_ND68: NutChuoi[] = [
  node(VB.nd68, "Mức 500 triệu đồng/năm", null),
  node(VB.nd141, "Thay cụm từ thành 01 tỷ đồng", "sua_doi"),
];
// Decree 68/2026 Art. 8(5) ← Decree 141/2026 Art. 1(2) (e-invoices).
const CHAIN_EINVOICE: NutChuoi[] = [
  node(VB.nd68, "Bắt buộc HĐĐT từ 01 tỷ đồng/năm trở lên", null),
  node(VB.nd141, "Bắt buộc HĐĐT khi doanh thu trên 01 tỷ đồng/năm", "sua_doi"),
];
// Decree 70/2025 Art. 1(8) (ends 01/07/2026, replaced by Decree 254/2026).
const CHAIN_ND70: NutChuoi[] = [
  node(VB.nd70, "HĐĐT từ máy tính tiền khi doanh thu từ 01 tỷ đồng/năm trở lên", null),
];

const CHAINS: Record<string, NutChuoi[]> = {
  "40-2021-TT-BTC-D4-K2": CHAIN_TT40,
  "09-2026-QH16-D2": CHAIN_VAT,
  "09-2026-QH16-D1": CHAIN_PIT,
  "68-2026-ND-CP-D3-K1": CHAIN_ND68,
  "68-2026-ND-CP-D4-K1": CHAIN_ND68,
  "68-2026-ND-CP-D8-K1": CHAIN_ND68,
  "141-2026-ND-CP-D1-K1": CHAIN_ND68,
  "141-2026-ND-CP-D3": CHAIN_ND68,
  "141-2026-ND-CP-D4-K1": CHAIN_ND68,
  "68-2026-ND-CP-D8-K5": CHAIN_EINVOICE,
  "141-2026-ND-CP-D1-K2": CHAIN_EINVOICE,
  "70-2025-ND-CP-D1-K8": CHAIN_ND70,
};

function detail(id: string): ChiTietDieuKhoan {
  const p = prov(id);
  return {
    van_ban: doc(p.so_hieu),
    chuoi: CHAINS[id] ?? [node(doc(p.so_hieu), "", null)],
    dieu_khoan: {
      id: p.id,
      so_hieu: p.so_hieu,
      dieu: p.dieu,
      khoan: p.khoan,
      noi_dung: p.noi_dung,
      trang: p.trang,
      ...(p.trang_nguon ? { trang_nguon: p.trang_nguon } : {}),
      ...(p.nguon_pdf ? { nguon_pdf: p.nguon_pdf } : {}),
    },
  };
}

/** Cut a verbatim sentence out of the article text: from `start` to the next "." (or `until`). */
function quoteFrom(id: string, start: string, until?: string): string {
  const text = prov(id).noi_dung;
  const from = text.indexOf(start);
  if (from < 0) throw new Error(`mock quote not found in ${id}: ${start}`);
  if (until) {
    const stop = text.indexOf(until, from);
    if (stop < 0) throw new Error(`mock quote end not found in ${id}: ${until}`);
    return text.slice(from, stop + until.length);
  }
  const end = text.indexOf(".", from);
  return text.slice(from, end < 0 ? undefined : end + 1);
}

function cite(id: string, start: string, until?: string) {
  return { id, cau_trich: quoteFrom(id, start, until), trang: prov(id).trang };
}

const STEPS = ["ton_tai", "con_hieu_luc", "khop_nguyen_van", "mo_hinh_danh_gia"] as const;

/** One attempt: checks run in order and stop at the first failure. */
function attempt(lan_thu: number, failAt?: (typeof STEPS)[number], ly_do?: string): LanKiemChung {
  const stop = failAt ? STEPS.indexOf(failAt) : STEPS.length;
  return {
    lan_thu,
    buoc: STEPS.slice(0, Math.min(stop + 1, STEPS.length)).map((ma, i) =>
      i === stop ? { ma, dat: false, ly_do } : { ma, dat: true },
    ),
  };
}

export type MockScenario = "verified" | "unverified";

/** Language of the prepared prose (answers, tasks, reasons). Citations stay verbatim Vietnamese. */
export type MockLang = "en" | "vi";

export function pickScenario(question: string): MockScenario {
  return /hoá đơn|hóa đơn|hoa don|invoice/i.test(question.normalize("NFC"))
    ? "unverified"
    : "verified";
}

export const MOCK_SUGGESTIONS = [
  "Quán cà phê của tôi doanh thu khoảng 700 triệu một năm thì có phải nộp thuế không?",
  "Quán tôi có bắt buộc dùng hoá đơn điện tử từ máy tính tiền không?",
] as const;

export const MOCK_SUGGESTIONS_EN = [
  "My café makes about 700 million VND a year. Do I have to pay tax?",
  "Do I have to use e-invoices from a cash register?",
] as const;

export function mockSuggestions(lang: MockLang): readonly string[] {
  return lang === "en" ? MOCK_SUGGESTIONS_EN : MOCK_SUGGESTIONS;
}

/** What the mic example "hears" in film / mock mode (the real flow uses Muse Voice Transcribe). */
export const MOCK_TRANSCRIPT = MOCK_SUGGESTIONS[0];
export const MOCK_TRANSCRIPT_EN = MOCK_SUGGESTIONS_EN[0];

export function mockTranscript(lang: MockLang): string {
  return lang === "en" ? MOCK_TRANSCRIPT_EN : MOCK_TRANSCRIPT;
}

/** Example photo reading for film / mock mode — not a real document (the UI labels it). */
export const MOCK_PHOTO_READING = {
  la_giay_to_thue: true,
  loai_giay_to: "Thông báo về thuế (ảnh mẫu)",
  tom_tat:
    "Ảnh mẫu: thông báo đề nghị hộ kinh doanh tự kê khai doanh thu năm 2026 với cơ quan thuế.",
  ngay_tren_giay: "",
  cau_hoi_goi_y: MOCK_SUGGESTIONS[0],
} as const;

export const MOCK_PHOTO_READING_EN = {
  la_giay_to_thue: true,
  loai_giay_to: "Tax notice (example photo)",
  tom_tat:
    "Example photo: a notice asking the household business to declare its 2026 revenue to the tax authority.",
  ngay_tren_giay: "",
  cau_hoi_goi_y: MOCK_SUGGESTIONS_EN[0],
} as const;

export function mockPhotoReading(lang: MockLang) {
  return lang === "en" ? MOCK_PHOTO_READING_EN : MOCK_PHOTO_READING;
}

const BILLION = 1_000_000_000;

// ── /ask ─────────────────────────────────────────────────────────────────────────────────────
export function mockAsk(
  req: AskRequest,
  scenario: MockScenario,
  lang: MockLang = "vi",
): AskResponseMoRong {
  const en = lang === "en";
  const d = req.ngay_ap_dung;
  const rev = req.ho_so.doanh_thu_nam;
  const revText = en ? formatVndWordsEn(rev) : formatVndWords(rev);
  const dateText = formatDate(d);
  const afterNd68 = compareIso(d, VB.nd68.hieu_luc_tu) >= 0;

  if (scenario === "unverified") return einvoice(rev, revText, dateText, afterNd68, en);

  // Before 01/01/2026: Circular 40/2021, 100 million.
  if (compareIso(d, "2026-01-01") < 0) {
    const over = rev > 100_000_000;
    return {
      tra_loi: en
        ? over
          ? `On ${dateText}, revenue of up to 100 million VND a year was exempt from VAT and personal income tax (Circular 40/2021/TT-BTC). Revenue of ${revText} is above this level, so the café has to pay tax.`
          : `On ${dateText}, revenue of ${revText} does not exceed 100 million VND a year, so the café does not pay VAT or personal income tax (Circular 40/2021/TT-BTC).`
        : over
          ? `Tại ngày ${dateText}, mức doanh thu không phải nộp thuế GTGT và thuế TNCN là từ 100 triệu đồng/năm trở xuống. Doanh thu ${revText} cao hơn mức này, nên quán thuộc diện phải nộp thuế.`
          : `Tại ngày ${dateText}, doanh thu ${revText} không vượt mức 100 triệu đồng/năm, nên quán không phải nộp thuế GTGT và thuế TNCN.`,
      trich_dan: [cite("40-2021-TT-BTC-D4-K2", "Hộ kinh doanh, cá nhân kinh doanh có doanh thu")],
      checklist: [],
      can_xac_nhan: false,
      kiem_chung: [attempt(1)],
    };
  }

  const over = rev > BILLION;
  const retro = compareIso(d, VB.nd141.ngay_ban_hanh) < 0;
  const retroNote = !retro
    ? ""
    : en
      ? " Decree 141/2026/NĐ-CP was issued on 29/04/2026 but applies from 01/01/2026, so the 1 billion VND threshold applies retroactively to this date."
      : " Nghị định 141/2026/NĐ-CP ban hành ngày 29/04/2026 nhưng có hiệu lực từ 01/01/2026, nên mức 01 tỷ đồng áp dụng hồi tố cho ngày này.";
  const base = [
    cite("141-2026-ND-CP-D1-K1", "Sửa đổi cụm từ"),
    cite("09-2026-QH16-D2", "Hàng hóa, dịch vụ của hộ"),
    cite("09-2026-QH16-D1", "Cá nhân cư trú"),
    ...(retro ? [cite("141-2026-ND-CP-D3", "Nghị định này có hiệu lực")] : []),
  ];
  const lead = en
    ? "From 01/01/2026, the law lets the Government set the annual revenue level below which a household business pays no VAT and no personal income tax; Decree 141/2026/NĐ-CP changes that level in Decree 68/2026/NĐ-CP from “500 million VND” to “1 billion VND”."
    : "Từ 01/01/2026, luật giao Chính phủ quy định mức doanh thu năm không chịu thuế GTGT và không phải nộp thuế TNCN; Nghị định 141/2026/NĐ-CP sửa mức trong Nghị định 68/2026/NĐ-CP từ “500 triệu đồng” thành “01 tỷ đồng”.";

  // 01/01–04/03/2026: Decree 68 itself starts on 05/03/2026 — say so and ask for confirmation.
  if (!afterNd68) {
    return {
      tra_loi: en
        ? `${lead} Decree 68/2026/NĐ-CP takes effect on 05/03/2026, so how this level applies on ${dateText} needs confirmation from an accountant or the tax authority.${retroNote}`
        : `${lead} Nghị định 68/2026/NĐ-CP có hiệu lực từ 05/03/2026, nên cách áp dụng mức này cho ngày ${dateText} cần kế toán hoặc cơ quan thuế xác nhận.${retroNote}`,
      trich_dan: base,
      checklist: [],
      can_xac_nhan: true,
      kiem_chung: [
        attempt(
          1,
          "con_hieu_luc",
          en
            ? `Citation 1 (68-2026-ND-CP-D3-K1): not yet in force on ${dateText} (Decree 68/2026/NĐ-CP takes effect on 05/03/2026).`
            : `Trích dẫn 1 (68-2026-ND-CP-D3-K1): chưa có hiệu lực tại ngày ${dateText} (Nghị định 68/2026/NĐ-CP có hiệu lực từ 05/03/2026).`,
        ),
        attempt(2),
      ],
    };
  }

  const year = Number(d.slice(0, 4));
  return {
    tra_loi: en
      ? over
        ? `${lead} The café's revenue of ${revText} is above 1 billion VND, so the café declares and pays tax as required.${retroNote}`
        : `${lead} The café's revenue of ${revText} does not exceed 1 billion VND, so the café does not pay VAT or personal income tax, but it must still report its actual revenue to the tax authority.${retroNote}`
      : over
        ? `${lead} Doanh thu ${revText} của quán cao hơn mức 01 tỷ đồng, nên quán khai thuế, nộp thuế theo quy định.${retroNote}`
        : `${lead} Doanh thu ${revText} của quán không vượt mức 01 tỷ đồng, nên quán không phải nộp thuế GTGT và thuế TNCN, nhưng vẫn phải thông báo doanh thu thực tế với cơ quan thuế.${retroNote}`,
    trich_dan: over
      ? base
      : [
          ...base,
          cite("68-2026-ND-CP-D8-K1", "Trường hợp hộ kinh doanh, cá nhân kinh doanh tự xác định"),
          cite("141-2026-ND-CP-D4-K1", "Trường hợp hộ kinh doanh"),
        ],
    checklist: over
      ? []
      : [
          {
            viec: en
              ? `Report the actual revenue for ${year} to the tax authority`
              : `Thông báo doanh thu thực tế năm ${year} với cơ quan thuế`,
            han: `${year + 1}-01-31`,
            can_cu: "68-2026-ND-CP-D8-K1",
          },
          {
            viec: en
              ? "Check the VAT and personal income tax declared and paid in 2026 to settle any tax already paid — needs accountant confirmation"
              : "Đối chiếu các khoản GTGT, TNCN đã kê khai, nộp trong năm 2026 để xử lý số thuế đã nộp — cần kế toán xác nhận",
            han: "",
            can_cu: "141-2026-ND-CP-D4-K1",
          },
        ],
    can_xac_nhan: false,
    kiem_chung: [
      attempt(
        1,
        "con_hieu_luc",
        en
          ? `Citation 1 (68-2026-ND-CP-D3-K1): does not apply on ${dateText}: amended by 141-2026-ND-CP-D1-K1 (from 01/01/2026). Look for the provision that applies.`
          : `Trích dẫn 1 (68-2026-ND-CP-D3-K1): không áp dụng ngày ${dateText}: đã bị sửa đổi bởi 141-2026-ND-CP-D1-K1 (từ 01/01/2026). Tìm điều khoản đang áp dụng.`,
      ),
      attempt(2),
    ],
  };
}

function einvoice(
  rev: number,
  revText: string,
  dateText: string,
  afterNd68: boolean,
  en: boolean,
): AskResponseMoRong {
  const mustUse = afterNd68 ? rev > BILLION : rev >= BILLION;
  const basis = afterNd68 ? "141-2026-ND-CP-D1-K2" : "70-2025-ND-CP-D1-K8";
  let tra_loi: string;
  if (en) {
    const rule = afterNd68
      ? "from 01/01/2026, a household business with annual revenue above 1 billion VND must use e-invoices coded by the tax authority or generated from a cash register (Decree 141/2026/NĐ-CP)"
      : `on ${dateText}, a household business with annual revenue of 1 billion VND or more uses e-invoices generated from a cash register (Decree 70/2025/NĐ-CP)`;
    tra_loi = mustUse
      ? `According to the regulations, ${rule}. With revenue of ${revText} a year, the café falls under this rule. The texts word the case of exactly 1 billion VND differently, so an accountant needs to confirm.`
      : `According to the regulations, ${rule}. With revenue of ${revText} a year, the café is not yet required to use them and may register to use them if it wishes. The texts word the case of exactly 1 billion VND differently, so an accountant needs to confirm.`;
  } else {
    const rule = afterNd68
      ? "từ 01/01/2026, hộ kinh doanh có doanh thu năm trên 01 tỷ đồng phải dùng hoá đơn điện tử có mã của cơ quan thuế hoặc khởi tạo từ máy tính tiền"
      : `tại ngày ${dateText}, hộ kinh doanh có doanh thu hằng năm từ 01 tỷ đồng trở lên dùng hoá đơn điện tử khởi tạo từ máy tính tiền`;
    tra_loi = mustUse
      ? `Theo văn bản, ${rule}. Với doanh thu ${revText}/năm, quán thuộc diện này. Cách hiểu ở đúng mức 01 tỷ đồng khác nhau giữa các văn bản, nên cần kế toán xác nhận.`
      : `Theo văn bản, ${rule}. Với doanh thu ${revText}/năm, quán chưa thuộc diện bắt buộc và có thể đăng ký dùng nếu có nhu cầu. Cách hiểu ở đúng mức 01 tỷ đồng khác nhau giữa các văn bản, nên cần kế toán xác nhận.`;
  }
  return {
    tra_loi,
    trich_dan: afterNd68
      ? [
          cite(
            "141-2026-ND-CP-D1-K2",
            "Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm trên 01 tỷ",
          ),
          cite(
            "68-2026-ND-CP-D8-K5",
            "Hộ kinh doanh, cá nhân kinh doanh có doanh thu tính thuế giá trị gia tăng hằng năm từ 01 tỷ",
            "hóa đơn điện tử có mã của cơ quan thuế",
          ),
        ]
      : [
          cite(
            "70-2025-ND-CP-D1-K8",
            "Hộ kinh doanh, cá nhân kinh doanh theo quy định tại khoản 1 Điều 51",
            "từ 01 tỷ đồng trở lên",
          ),
        ],
    checklist: [
      {
        viec: en
          ? "Ask an accountant about the e-invoice obligation when revenue is close to 1 billion VND"
          : "Hỏi kế toán về nghĩa vụ hoá đơn điện tử khi doanh thu gần mức 01 tỷ đồng",
        han: "",
        can_cu: basis,
      },
    ],
    can_xac_nhan: true,
    kiem_chung: [
      attempt(
        1,
        "con_hieu_luc",
        en
          ? afterNd68
            ? `Citation 2 (68-2026-ND-CP-D8-K5): does not apply on ${dateText}: amended by 141-2026-ND-CP-D1-K2.`
            : `Citation 1 (68-2026-ND-CP-D8-K5): not yet in force on ${dateText}.`
          : afterNd68
            ? `Trích dẫn 2 (68-2026-ND-CP-D8-K5): không áp dụng ngày ${dateText}: đã bị sửa đổi bởi 141-2026-ND-CP-D1-K2.`
            : `Trích dẫn 1 (68-2026-ND-CP-D8-K5): chưa có hiệu lực tại ngày ${dateText}.`,
      ),
      attempt(
        2,
        "khop_nguyen_van",
        en
          ? "Citation 1: the quoted sentence does not appear verbatim on the cited page."
          : "Trích dẫn 1: câu trích không có nguyên văn ở trang đã dẫn.",
      ),
      attempt(
        3,
        "mo_hinh_danh_gia",
        en
          ? "The claim about revenue of exactly 1 billion VND has no clear basis: “từ 01 tỷ đồng trở lên” (1 billion VND or more, Decree 70/2025/NĐ-CP) differs from “trên 01 tỷ đồng” (above 1 billion VND, Decree 141/2026/NĐ-CP)."
          : "Nhận định về trường hợp doanh thu đúng 01 tỷ đồng chưa có căn cứ rõ: “từ 01 tỷ đồng trở lên” (Nghị định 70/2025) khác “trên 01 tỷ đồng” (Nghị định 141/2026).",
      ),
    ],
  };
}

export function mockDetail(id: string): ChiTietDieuKhoan | null {
  return PROVS[id] ? detail(id) : null;
}

// ── /ingest ──────────────────────────────────────────────────────────────────────────────────
// Role A's replay scenario (demo/role_a/expected.json): Decree 141/2026 added to a corpus that
// held Decree 68/2026. Excerpts are verbatim from 141; the old texts are verbatim from 68.
const strip = (s: string) => s.replace(/^\d+\.\s*/, "");

export function mockIngest(hoSo: HoSo, lang: MockLang = "vi"): IngestResponse {
  const en = lang === "en";
  const rev = hoSo.doanh_thu_nam;
  const revText = en ? formatVndWordsEn(rev) : formatVndWords(rev);
  const between = rev > 500_000_000 && rev <= BILLION;
  const phrase = strip(prov("141-2026-ND-CP-D1-K1").noi_dung);
  const why = en
    ? between
      ? `The “500 million VND” level in this clause is changed to “1 billion VND”, applying from 01/01/2026. The café's revenue of ${revText} lies between the two levels, so this change affects the café.`
      : rev <= 500_000_000
        ? `The “500 million VND” level is changed to “1 billion VND”. The café's revenue of ${revText} was already below the old level, so the outcome for the café does not change.`
        : `The “500 million VND” level is changed to “1 billion VND”. The café's revenue of ${revText} is still above the new level.`
    : between
      ? `Mức “500 triệu đồng” trong khoản này được sửa thành “01 tỷ đồng”, áp dụng từ 01/01/2026. Doanh thu ${revText} của quán nằm giữa hai mức, nên thay đổi này ảnh hưởng tới quán.`
      : rev <= 500_000_000
        ? `Mức “500 triệu đồng” được sửa thành “01 tỷ đồng”. Doanh thu ${revText} của quán đã dưới mức cũ, nên kết quả cho quán không đổi.`
        : `Mức “500 triệu đồng” được sửa thành “01 tỷ đồng”. Doanh thu ${revText} của quán vẫn cao hơn mức mới.`;
  const row = (target: string) => ({
    trich_doan: phrase,
    loai: "sua_doi" as const,
    dieu_bi_tac_dong: target,
    anh_huong_toi_ho_so: between,
    giai_thich: why,
    viec_can_lam: "",
    han: "",
    dieu_cu: { id: target, so_hieu: VB.nd68.so_hieu, noi_dung: prov(target).noi_dung },
  });
  const exactlyBillion = rev === BILLION;
  const invoiceRow = {
    trich_doan: quoteFrom(
      "141-2026-ND-CP-D1-K2",
      "Hộ kinh doanh, cá nhân kinh doanh có doanh thu năm trên 01 tỷ",
    ),
    loai: "sua_doi" as const,
    dieu_bi_tac_dong: "68-2026-ND-CP-D8-K5",
    anh_huong_toi_ho_so: exactlyBillion,
    giai_thich: en
      ? exactlyBillion
        ? "The level at which e-invoices are mandatory changes from “1 billion VND or more” to “above 1 billion VND”; revenue of exactly 1 billion VND is no longer required to use them."
        : `The level at which e-invoices are mandatory changes from “1 billion VND or more” to “above 1 billion VND”. With revenue of ${revText}, the café's obligation does not change.`
      : exactlyBillion
        ? "Mức bắt buộc dùng hoá đơn điện tử đổi từ “từ 01 tỷ đồng trở lên” thành “trên 01 tỷ đồng”; doanh thu đúng 01 tỷ đồng không còn thuộc diện bắt buộc."
        : `Mức bắt buộc dùng hoá đơn điện tử đổi từ “từ 01 tỷ đồng trở lên” thành “trên 01 tỷ đồng”. Với doanh thu ${revText}, nghĩa vụ của quán không đổi.`,
    viec_can_lam: "",
    han: "",
    dieu_cu: {
      id: "68-2026-ND-CP-D8-K5",
      so_hieu: VB.nd68.so_hieu,
      noi_dung: prov("68-2026-ND-CP-D8-K5").noi_dung,
    },
  };
  const rows = [
    row("68-2026-ND-CP-D3-K1"),
    row("68-2026-ND-CP-D4-K1"),
    row("68-2026-ND-CP-D8-K1"),
    invoiceRow,
  ];
  return {
    van_ban_moi: {
      so_hieu: VB.nd141.so_hieu,
      tieu_de: VB.nd141.tieu_de,
      hieu_luc_tu: VB.nd141.hieu_luc_tu,
      ngay_ban_hanh: VB.nd141.ngay_ban_hanh,
    },
    dieu_bi_anh_huong: rows,
    viec_can_lam: between
      ? [
          {
            // Verbatim from role A's expected.json (viec_goi_y); no deadline is stated in the text.
            // The English line is a translation of it.
            viec: en
              ? "Check annual revenue and the VAT/personal income tax declared and paid, to see whether overpaid tax should be settled under Article 4(1) of Decree 141/2026/NĐ-CP and Article 12 of Decree 68/2026/NĐ-CP."
              : "Đối chiếu doanh thu năm và các khoản GTGT/TNCN đã kê khai, nộp để kiểm tra xử lý số thuế nộp thừa theo Điều 4 khoản 1 Nghị định 141 và Điều 12 Nghị định 68.",
            han: "",
            can_cu: "141-2026-ND-CP-D4-K1",
            trich_doan: strip(prov("141-2026-ND-CP-D4-K1").noi_dung),
          },
        ]
      : [],
    bi_loai: [],
    can_xac_nhan: true,
  };
}
