import type { LoaiQuanHe, MaKiemChung, TrangThai } from "../api/contract";

/**
 * Every UI string, Vietnamese (DESIGN.md §12). `en.ts` has the same shape (checked by `Dict`).
 * Never use "tư vấn", "đảm bảo" or "chính xác 100%" here — the only exception is the mandated
 * disclaimer, which says LexVi is *not* "tư vấn".
 */
export const vi = {
  brand: "LexVi",
  tagline: "Tra cứu thuế có trích dẫn",

  nav: {
    ask: "Hỏi đáp",
    alerts: "Cảnh báo",
    profile: "Hồ sơ",
    benchmark: "Kiểm thử",
    label: "Điều hướng chính",
  },

  lang: {
    label: "Ngôn ngữ",
    en: "EN",
    vi: "VI",
    enName: "English",
    viName: "Tiếng Việt",
  },

  disclaimer: {
    full: "Thông tin tham khảo có trích dẫn, không phải tư vấn. Cần kế toán hoặc cơ quan thuế xác nhận.",
    short: "Thông tin tham khảo có trích dẫn — cần kế toán hoặc cơ quan thuế xác nhận.",
  },

  /** Shown only in the English UI; empty in Vietnamese. */
  sourceNote: "",

  mockBadge: "Dữ liệu minh hoạ · chưa kết nối máy chủ",
  mockNote: "Các con số, điều khoản và hạn trong bản mẫu này chưa được đối chiếu với văn bản gốc.",
  mockFlag: "Dữ liệu minh hoạ",
  openArticle: "Mở điều khoản",
  answerReady: "Đã có câu trả lời.",

  ask: {
    title: "Hỏi về thuế của quán bạn",
    subtitle:
      "Câu trả lời chỉ dựa trên văn bản còn hiệu lực tại ngày bạn chọn, kèm điều khoản gốc.",
    placeholder: "Hỏi về thuế của quán bạn…",
    inputLabel: "Câu hỏi",
    send: "Gửi câu hỏi",
    more: "Thêm cách nhập",
    suggestions: "Câu hỏi mẫu",
    searching: "Đang tìm điều khoản theo ngày áp dụng…",
    error: "Không lấy được câu trả lời. Hãy thử lại.",
    empty: "Nhập câu hỏi hoặc chọn một câu hỏi mẫu để bắt đầu.",
  },

  appliedDate: {
    label: "Áp dụng tại ngày",
    today: "Hôm nay",
    change: "Đổi ngày áp dụng",
    tryOther: "Thử ngày khác:",
  },

  mic: {
    idle: "Hỏi bằng giọng nói",
    listening: "Đang nghe…",
    transcribing: "Đang chuyển giọng nói thành chữ…",
    error: "Không nhận được giọng nói — hãy gõ câu hỏi",
  },

  photo: {
    label: "Gửi ảnh thông báo thuế hoặc hoá đơn",
    attached: "Ảnh đính kèm",
    notConnected: "Bản mẫu: chưa đọc nội dung ảnh",
    remove: "Bỏ ảnh",
  },

  profile: {
    chipLabel: "Hồ sơ kinh doanh",
    edit: "Sửa hồ sơ",
    title: "Hồ sơ kinh doanh",
    description: "Mọi câu trả lời đều dựa trên hồ sơ này.",
    loaiHinh: "Loại hình",
    nganh: "Ngành nghề",
    doanhThu: "Doanh thu năm (đồng)",
    diaBan: "Địa bàn",
    save: "Lưu hồ sơ",
    perYear: "/năm",
    loai: { ho_kinh_doanh: "Hộ kinh doanh", doanh_nghiep_nho: "Doanh nghiệp nhỏ" },
  },

  answer: {
    heading: "Câu trả lời",
    citations: "Căn cứ",
    checklist: "Việc cần làm",
    noChecklist: "Không có việc cần làm thêm cho câu hỏi này.",
    forDate: "Áp dụng tại ngày",
    accountantStep: "Bước cuối: nhờ kế toán hoặc cơ quan thuế xác nhận trước khi thực hiện.",
  },

  status: {
    con_hieu_luc: "Còn hiệu lực",
    da_sua_doi: "Đã sửa đổi",
    het_hieu_luc: "Hết hiệu lực",
    can_xac_nhan: "Cần kế toán xác nhận",
    huong_dan: "Hướng dẫn",
    verified: "Đã kiểm chứng",
    notYet: "Chưa có hiệu lực",
  } satisfies Record<TrangThai | "verified" | "notYet", string>,

  relation: {
    sua_doi: "sửa đổi",
    thay_the: "thay thế",
    bai_bo: "bãi bỏ",
    huong_dan: "hướng dẫn",
    dan_chieu: "dẫn chiếu",
  } satisfies Record<LoaiQuanHe, string>,

  verify: {
    title: "Kiểm chứng trước khi trả lời",
    attempt: (n: number, max: number) => `lần ${n}/${max}`,
    steps: {
      ton_tai: "Điều khoản tồn tại",
      con_hieu_luc: "Còn hiệu lực tại ngày áp dụng",
      khop_nguyen_van: "Trích dẫn khớp nguyên văn",
      mo_hinh_danh_gia: "Mô hình kiểm tra nhận định",
    } satisfies Record<MaKiemChung, string>,
    running: "Đang kiểm tra",
    passed: "Đạt",
    failed: "Không đạt",
    skipped: "Chưa chạy",
    reason: "Lý do",
    sentBack: "đã gửi lại để sửa",
    allPassed: "Đã kiểm chứng: mọi trích dẫn đều tồn tại, còn hiệu lực và khớp nguyên văn.",
    gaveUp: "Sau 3 lần chưa đạt — cần kế toán xác nhận.",
    notPassed: "Kiểm chứng chưa đạt — cần kế toán xác nhận.",
    statusNeedsConfirm:
      "Các bước kiểm tra đã đạt, nhưng có căn cứ chưa ở trạng thái còn hiệu lực tại ngày áp dụng — cần kế toán xác nhận.",
    finalOnly: "Máy chủ chỉ trả về kết quả cuối.",
  },

  drawer: {
    close: "Đóng",
    document: "Văn bản",
    issued: "Ngày ban hành",
    effectiveFrom: "Hiệu lực từ",
    appliesFrom: "Áp dụng từ",
    effectiveUntil: "Hết hiệu lực",
    stillInForce: "—",
    page: "Trang",
    source: "Xem văn bản gốc",
    quote: "Câu được trích",
    articleText: "Nội dung điều khoản",
    chain: "Chuỗi sửa đổi",
    chainHint: "Văn bản có dấu kiểm và nhãn «Còn hiệu lực» là văn bản áp dụng tại ngày bạn chọn.",
    issuedRetro: (issued: string) => `ban hành ${issued} · áp dụng hồi tố`,
    retroactive: (issued: string, from: string) =>
      `Ban hành ${issued}, sau ngày áp dụng, nhưng có hiệu lực hồi tố từ ${from}. Cách tính hồi tố cần thống nhất với kế toán.`,
    illustrative: "Nội dung minh hoạ — chưa đối chiếu văn bản gốc",
    loading: "Đang tải điều khoản…",
    noDetail: "Máy chủ chưa trả về chi tiết điều khoản.",
  },

  due: {
    overdue: (n: number) => `quá hạn ${n} ngày`,
    today: "hạn hôm nay",
    left: (n: number) => `còn ${n} ngày`,
    noDeadline: "Văn bản không nêu hạn",
    basis: "Căn cứ",
    markDone: "Đánh dấu đã xong",
  },

  impact: {
    title: "Văn bản mới ảnh hưởng tới bạn",
    subtitle:
      "Thả một văn bản pháp luật mới (PDF). LexVi tìm điều khoản bị thay đổi, đối chiếu với hồ sơ của bạn và lập việc cần làm.",
    dropTitle: "Kéo thả tệp PDF vào đây",
    dropHint: "PDF có lớp chữ, tối đa 20 MB",
    choose: "Chọn tệp PDF",
    sample: "Dùng văn bản mẫu",
    sampleName: "van-ban-mau.pdf",
    scanning: "Đang đọc văn bản…",
    scanningHint: "Đối chiếu từng thay đổi với kho điều khoản và hồ sơ của bạn.",
    errNotPdf: "Tệp này không phải PDF. Hãy chọn một tệp PDF có lớp chữ.",
    errTooBig: "Tệp lớn hơn 20 MB.",
    errFailed: "Không đọc được văn bản. Hãy thử lại.",
    errNeedFile: "Máy chủ cần một tệp PDF thật; văn bản mẫu chỉ dùng khi chạy dữ liệu minh hoạ.",
    newDoc: "Văn bản mới",
    appliesFrom: (d: string) => `Áp dụng từ ${d}`,
    affectedCount: (n: number, total: number) =>
      `${n}/${total} thay đổi ảnh hưởng tới quán của bạn`,
    changes: "Điều khoản bị thay đổi",
    before: "Trước đây",
    after: "Văn bản mới",
    affects: "Ảnh hưởng tới quán của bạn",
    notAffects: "Không ảnh hưởng tới quán của bạn",
    tasks: "Việc cần làm",
    noTasks: "Không có việc cần làm cho hồ sơ này.",
    dropped: (n: number) => `${n} thay đổi bị loại vì không kiểm chứng được`,
    droppedHint:
      "LexVi chỉ hiển thị thay đổi có trích đoạn nguyên văn trong văn bản mới và trỏ tới điều khoản có trong kho.",
    another: "Đọc văn bản khác",
  },

  placeholder: {
    title: "Đang xây dựng",
    body: "Màn hình này sẽ có trong bản demo.",
    back: "Về Hỏi đáp",
  },
} as const;
