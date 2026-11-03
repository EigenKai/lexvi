// MOCK — typed stand-in for role B's `/ask` and the proposed `GET /dieu-khoan/{id}`.
//
// [ILLUSTRATIVE] Every document number, date, article number, quote, threshold and deadline below
// comes from secondary sources (planning/research/01-tax-law-facts.md) and has NOT been checked by
// role A against the original text. Article texts are placeholders written for layout, not quotes.
// Replace with A's verified corpus before recording the demo (constraints.md kill criteria).

import { compareIso, formatDate, formatVndWords } from "../format";
import type {
  AskRequest,
  AskResponseMoRong,
  ChiTietDieuKhoan,
  LanKiemChung,
  NutChuoi,
  VanBan,
} from "./contract";

const SRC = "https://vbpl.vn/"; // [ILLUSTRATIVE] replace with each document's official URL from A

// ── Documents ────────────────────────────────────────────────────────────────────────────────
const VB = {
  tt40: {
    so_hieu: "40/2021/TT-BTC",
    loai: "thông tư",
    tieu_de: "Hướng dẫn thuế GTGT, thuế TNCN và quản lý thuế đối với hộ, cá nhân kinh doanh",
    ngay_ban_hanh: "2021-06-01",
    hieu_luc_tu: "2021-08-01",
    // LOW confidence in research: "reportedly ceased to be in force on 05/3/2026" — confirm with A.
    het_hieu_luc: "2026-03-05",
    nguon_url: SRC,
  },
  l48: {
    so_hieu: "48/2024/QH15",
    loai: "luật",
    tieu_de: "Luật Thuế giá trị gia tăng",
    ngay_ban_hanh: "2024-11-26",
    hieu_luc_tu: "2025-07-01", // the law; its HKD threshold applies from 01/01/2026 (see chain)
    het_hieu_luc: null,
    nguon_url: SRC,
  },
  l149: {
    so_hieu: "149/2025/QH15",
    loai: "luật",
    tieu_de: "Luật sửa đổi, bổ sung một số điều của Luật Thuế giá trị gia tăng",
    ngay_ban_hanh: "2025-12-11",
    hieu_luc_tu: "2026-01-01",
    het_hieu_luc: null,
    nguon_url: SRC,
  },
  l09: {
    so_hieu: "09/2026/QH16",
    loai: "luật",
    tieu_de: "Luật sửa đổi, bổ sung một số điều của các luật về thuế",
    ngay_ban_hanh: "2026-04-24",
    hieu_luc_tu: "2026-04-24", // in force on passage; Arts. 1–3 apply from 01/01/2026 (see chain)
    het_hieu_luc: null,
    nguon_url: SRC,
  },
  nd68: {
    so_hieu: "68/2026/NĐ-CP",
    loai: "nghị định",
    tieu_de: "Quy định chính sách thuế và quản lý thuế đối với hộ kinh doanh, cá nhân kinh doanh",
    ngay_ban_hanh: "2026-03-05",
    hieu_luc_tu: "2026-03-05",
    het_hieu_luc: null,
    nguon_url: SRC,
  },
  nd70: {
    so_hieu: "70/2025/NĐ-CP",
    loai: "nghị định",
    tieu_de: "Sửa đổi, bổ sung Nghị định số 123/2020/NĐ-CP quy định về hoá đơn, chứng từ",
    ngay_ban_hanh: "2025-03-20",
    hieu_luc_tu: "2025-06-01",
    het_hieu_luc: null,
    nguon_url: SRC,
  },
  nd141: {
    so_hieu: "141/2026/NĐ-CP",
    loai: "nghị định",
    tieu_de: "Sửa đổi, bổ sung Nghị định số 68/2026/NĐ-CP và Nghị định số 320/2025/NĐ-CP",
    ngay_ban_hanh: "2026-04-29",
    hieu_luc_tu: "2026-01-01",
    het_hieu_luc: null,
    nguon_url: SRC,
  },
} satisfies Record<string, VanBan>;

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
    ...(ap_dung_tu ? { ap_dung_tu } : {}),
  };
}

/**
 * The exemption-threshold chain — LexVi's demo story (CLAUDE.md §6). [ILLUSTRATIVE]
 * Simplified to the VAT line; the PIT line (Law 109/2025, 500m) runs in parallel and is also
 * amended by Law 09/2026. Relation types (e.g. circular → law "thay_the") need A's confirmation.
 */
const THRESHOLD_CHAIN: NutChuoi[] = [
  node(VB.tt40, "≤ 100 triệu đồng/năm", null),
  node(VB.l48, "≤ 200 triệu đồng/năm", "thay_the", "2026-01-01"),
  node(VB.l149, "≤ 500 triệu đồng/năm", "sua_doi"),
  node(VB.l09, "Mức do Chính phủ quy định", "sua_doi", "2026-01-01"),
  node(VB.nd141, "≤ 1 tỷ đồng/năm", "huong_dan"),
];

const EINVOICE_CHAIN: NutChuoi[] = [
  node(VB.nd68, "Ngưỡng bắt buộc hoá đơn điện tử (bản gốc)", null),
  node(VB.nd141, "Bắt buộc khi doanh thu trên 1 tỷ đồng/năm", "sua_doi"),
];

const PLACEHOLDER = "[MINH HOẠ — chưa đối chiếu văn bản gốc]";

// ── Articles (id → detail) ───────────────────────────────────────────────────────────────────
const DETAILS: Record<string, ChiTietDieuKhoan> = {
  "tt40-2021-d4-k1": {
    van_ban: VB.tt40,
    chuoi: THRESHOLD_CHAIN,
    dieu_khoan: {
      id: "tt40-2021-d4-k1",
      so_hieu: VB.tt40.so_hieu,
      dieu: 4,
      khoan: 1,
      trang: 3,
      noi_dung: `${PLACEHOLDER} Hộ kinh doanh, cá nhân kinh doanh có doanh thu từ hoạt động sản xuất, kinh doanh trong năm dương lịch từ 100 triệu đồng trở xuống thì không phải nộp thuế giá trị gia tăng và không phải nộp thuế thu nhập cá nhân.`,
    },
  },
  "l09-2026-d2": {
    van_ban: VB.l09,
    chuoi: THRESHOLD_CHAIN,
    dieu_khoan: {
      id: "l09-2026-d2",
      so_hieu: VB.l09.so_hieu,
      dieu: 2,
      khoan: null,
      trang: 2,
      noi_dung: `${PLACEHOLDER} Sửa đổi khoản 25 Điều 5 Luật Thuế giá trị gia tăng và khoản 1 Điều 7 Luật Thuế thu nhập cá nhân: hàng hoá, dịch vụ của hộ, cá nhân kinh doanh có doanh thu năm từ mức quy định của Chính phủ trở xuống thuộc đối tượng không chịu thuế.`,
    },
  },
  "nd141-2026-d1-k1": {
    van_ban: VB.nd141,
    chuoi: THRESHOLD_CHAIN,
    dieu_khoan: {
      id: "nd141-2026-d1-k1",
      so_hieu: VB.nd141.so_hieu,
      dieu: 1,
      khoan: 1,
      trang: 1,
      noi_dung: `${PLACEHOLDER} Thay cụm từ "500 triệu đồng" bằng cụm từ "01 tỷ đồng" tại các điều của Nghị định số 68/2026/NĐ-CP. Hộ kinh doanh có doanh thu năm từ 01 tỷ đồng trở xuống không phải nộp thuế giá trị gia tăng và thuế thu nhập cá nhân.`,
    },
  },
  "nd68-2026-d13-k3": {
    van_ban: VB.nd68,
    chuoi: [node(VB.nd68, "Tự kê khai doanh thu", null)],
    dieu_khoan: {
      id: "nd68-2026-d13-k3",
      so_hieu: VB.nd68.so_hieu,
      dieu: 13,
      khoan: 3,
      trang: 9,
      noi_dung: `${PLACEHOLDER} Hộ kinh doanh, cá nhân kinh doanh tự kê khai đầy đủ, chính xác doanh thu và chịu trách nhiệm về tính trung thực của thông tin đã kê khai.`,
    },
  },
  "nd70-2025-d1-k11": {
    van_ban: VB.nd70,
    chuoi: [node(VB.nd70, "Bắt buộc HĐĐT máy tính tiền từ 1 tỷ đồng/năm trở lên", null)],
    dieu_khoan: {
      id: "nd70-2025-d1-k11",
      so_hieu: VB.nd70.so_hieu,
      dieu: 1,
      khoan: 11,
      trang: 4,
      noi_dung: `${PLACEHOLDER} Hộ, cá nhân kinh doanh có mức doanh thu hàng năm từ 01 tỷ đồng trở lên sử dụng hoá đơn điện tử khởi tạo từ máy tính tiền có kết nối chuyển dữ liệu điện tử với cơ quan thuế.`,
    },
  },
  "nd68-2026-d8-k5": {
    van_ban: VB.nd68,
    chuoi: EINVOICE_CHAIN,
    dieu_khoan: {
      id: "nd68-2026-d8-k5",
      so_hieu: VB.nd68.so_hieu,
      dieu: 8,
      khoan: 5,
      trang: 6,
      noi_dung: `${PLACEHOLDER} Hộ kinh doanh có doanh thu năm trên mức quy định phải sử dụng hoá đơn điện tử có mã của cơ quan thuế hoặc hoá đơn điện tử khởi tạo từ máy tính tiền có kết nối dữ liệu với cơ quan thuế.`,
    },
  },
};

/** Pull a sentence out of the article text so the quote always appears verbatim in the mock. */
function quoteFrom(id: string, start: string): string {
  const text = DETAILS[id].dieu_khoan.noi_dung;
  const from = text.indexOf(start);
  if (from < 0) throw new Error(`mock quote not found in ${id}`);
  const end = text.indexOf(".", from);
  return text.slice(from, end < 0 ? undefined : end + 1);
}

function cite(id: string, start: string) {
  return { id, cau_trich: quoteFrom(id, start), trang: DETAILS[id].dieu_khoan.trang };
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

export function pickScenario(question: string): MockScenario {
  return /hoá đơn|hóa đơn|hoa don/i.test(question) ? "unverified" : "verified";
}

export const MOCK_SUGGESTIONS = [
  "Quán cà phê của tôi doanh thu khoảng 800 triệu một năm thì có phải nộp thuế không?",
  "Quán tôi có bắt buộc dùng hoá đơn điện tử từ máy tính tiền không?",
] as const;

/** What the mic mock "hears" (the real flow sends the recording to Muse Voice Transcribe). */
export const MOCK_TRANSCRIPT = MOCK_SUGGESTIONS[0];

// ── /ask ─────────────────────────────────────────────────────────────────────────────────────
export function mockAsk(req: AskRequest, scenario: MockScenario): AskResponseMoRong {
  const d = req.ngay_ap_dung;
  const rev = req.ho_so.doanh_thu_nam;
  const revText = formatVndWords(rev);
  const dateText = formatDate(d);
  const in2026 = compareIso(d, "2026-01-01") >= 0;

  if (scenario === "unverified") {
    const afterNd68 = compareIso(d, VB.nd68.hieu_luc_tu) >= 0;
    const mustUse = afterNd68 ? rev > 1_000_000_000 : rev >= 1_000_000_000;
    const rule = afterNd68
      ? "mức bắt buộc là doanh thu trên 1 tỷ đồng/năm"
      : `tại ngày ${dateText}, mức bắt buộc dùng hoá đơn điện tử từ máy tính tiền là doanh thu từ 1 tỷ đồng/năm trở lên`;
    return {
      tra_loi: mustUse
        ? `Với doanh thu ${revText}/năm, quán của bạn thuộc diện phải dùng hoá đơn điện tử; ${rule}. Cách hiểu ở đúng mức 1 tỷ đồng còn khác nhau giữa các văn bản.`
        : `Với doanh thu ${revText}/năm, quán của bạn chưa bắt buộc dùng hoá đơn điện tử; ${rule}. Quán vẫn có thể đăng ký dùng tự nguyện. Cách hiểu ở đúng mức 1 tỷ đồng còn khác nhau giữa các văn bản.`,
      trich_dan: afterNd68
        ? [
            cite("nd68-2026-d8-k5", "Hộ kinh doanh có doanh thu năm trên"),
            cite("nd141-2026-d1-k1", "Thay cụm từ"),
          ]
        : [cite("nd70-2025-d1-k11", "Hộ, cá nhân kinh doanh")],
      checklist: [
        {
          viec: "Hỏi kế toán về nghĩa vụ hoá đơn khi doanh thu gần 1 tỷ đồng",
          han: "2026-11-18",
          can_cu: "nd68-2026-d8-k5",
        },
      ],
      can_xac_nhan: true,
      kiem_chung: [
        attempt(
          1,
          "con_hieu_luc",
          afterNd68
            ? "Trích Nghị định 70/2025/NĐ-CP (mức từ 1 tỷ đồng trở lên): đã có văn bản khác áp dụng tại ngày này."
            : `Trích Nghị định 68/2026/NĐ-CP: chưa có hiệu lực tại ngày ${dateText}.`,
        ),
        attempt(2, "khop_nguyen_van", "Câu trích không có nguyên văn ở trang 6."),
        attempt(
          3,
          "mo_hinh_danh_gia",
          "Nhận định về trường hợp doanh thu đúng 1 tỷ đồng chưa có căn cứ rõ.",
        ),
      ],
    };
  }

  if (!in2026) {
    const over = rev > 100_000_000;
    return {
      tra_loi: over
        ? `Tại ngày ${dateText}, mức doanh thu không phải nộp thuế GTGT và thuế TNCN là từ 100 triệu đồng/năm trở xuống. Doanh thu ${revText} cao hơn mức này, nên quán thuộc diện phải nộp thuế.`
        : `Tại ngày ${dateText}, doanh thu ${revText} không vượt mức 100 triệu đồng/năm, nên quán không phải nộp thuế GTGT và thuế TNCN.`,
      trich_dan: [cite("tt40-2021-d4-k1", "Hộ kinh doanh")],
      checklist: [],
      can_xac_nhan: false,
      kiem_chung: [attempt(1)],
    };
  }

  const over = rev > 1_000_000_000;
  const afterNd68 = compareIso(d, VB.nd68.hieu_luc_tu) >= 0;
  // Applied date before Decree 141 was issued: the 1-billion figure reaches this date only
  // retroactively. How to treat that is open decision 6 (A + B) — say it plainly meanwhile.
  const retro = compareIso(d, VB.nd141.ngay_ban_hanh) < 0;
  const retroNote = retro
    ? " Mức 1 tỷ đồng được ban hành ngày 29/04/2026 và áp dụng hồi tố từ 01/01/2026."
    : "";
  return {
    tra_loi: over
      ? `Từ 01/01/2026, mức không phải nộp thuế GTGT và thuế TNCN là doanh thu từ 1 tỷ đồng/năm trở xuống. Doanh thu ${revText} cao hơn mức này, nên quán nộp thuế theo tỷ lệ trên doanh thu.${retroNote}`
      : `Từ 01/01/2026, hộ kinh doanh có doanh thu từ 1 tỷ đồng/năm trở xuống không phải nộp thuế GTGT và thuế TNCN. Doanh thu ${revText} của quán không vượt mức này. Quán vẫn phải tự kê khai doanh thu.${retroNote}`,
    trich_dan: [
      cite("nd141-2026-d1-k1", "Hộ kinh doanh có doanh thu năm"),
      cite("l09-2026-d2", "hàng hoá, dịch vụ"),
      ...(afterNd68 ? [cite("nd68-2026-d13-k3", "Hộ kinh doanh")] : []),
    ],
    checklist: afterNd68
      ? [
          {
            viec: "Rà lại doanh thu ước tính năm 2026 so với mức 1 tỷ đồng",
            han: "2026-11-10",
            can_cu: "nd141-2026-d1-k1",
          },
          {
            viec: "Tự kê khai doanh thu năm 2026 với cơ quan thuế",
            han: "2027-01-31",
            can_cu: "nd68-2026-d13-k3",
          },
        ]
      : [],
    can_xac_nhan: false,
    kiem_chung: [
      attempt(
        1,
        "con_hieu_luc",
        retro
          ? `Trích Luật 149/2025/QH15 (mức 500 triệu đồng): có văn bản ban hành sau ngày ${dateText} nhưng áp dụng hồi tố cho ngày này. Tìm văn bản đang áp dụng.`
          : `Trích Luật 149/2025/QH15 (mức 500 triệu đồng): đã được sửa đổi tại ngày ${dateText}. Tìm văn bản đang áp dụng.`,
      ),
      attempt(2),
    ],
  };
}

export function mockDetail(id: string): ChiTietDieuKhoan | null {
  return DETAILS[id] ?? null;
}
