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
    home: "Trang chủ",
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

  notFound: { title: "Trang này không tồn tại." },

  skipToContent: "Chuyển tới nội dung chính",

  mockBadge: "Phản hồi mẫu chuẩn bị sẵn · không phải kết quả trực tiếp",
  mockNote:
    "Dựng từ kho văn bản thật: nội dung điều khoản trích nguyên văn từ PDF chính thức, nhưng câu trả lời được chuẩn bị cho bản demo, không do hệ thống tạo trực tiếp.",
  mockFlag: "Phản hồi mẫu",
  live: {
    badge: "Trực tiếp · Muse Spark",
    checking: "Đang kết nối máy chủ trực tiếp…",
    waking: "Đang đánh thức máy chủ trực tiếp (gói miễn phí), mất khoảng một phút…",
    ready:
      "Câu trả lời đến trực tiếp từ Muse Spark, mất khoảng một phút. Mỗi người dùng có giới hạn lượt hỏi.",
    down: "Máy chủ trực tiếp chưa phản hồi. Hãy thử lại sau một phút, hoặc dùng phản hồi mẫu.",
    toPrepared: "Phản hồi mẫu (tức thì) →",
    tryLive: "Dùng thử trực tiếp →",
  },
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
    errTimeout: "Máy chủ trả lời quá lâu. Hãy thử lại.",
    errLength: "Câu hỏi cần từ 3 đến 2.000 ký tự.",
    errLimit: "Bản demo trực tiếp đang chạm giới hạn. Hãy thử lại sau, hoặc dùng phản hồi mẫu.",
    errDown: "Máy chủ trực tiếp không phản hồi. Hãy thử lại sau một phút.",
    tooLong: (n: number) => `${n.toLocaleString("vi-VN")} / 2.000 ký tự`,
    empty: "Nhập câu hỏi hoặc chọn một câu hỏi mẫu để bắt đầu.",
    elapsed: (s: number) => `${s} giây`,
    runMeta: (steps: number, secs: number) => `${steps} bước · ${secs} giây`,
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
    error: "Không chuyển được giọng nói — hãy thử lại hoặc gõ câu hỏi",
    canned: "Bản ghi âm mẫu — không phải chuyển giọng nói trực tiếp",
    stop: "Dừng ghi âm",
    seconds: (s: number, max: number) => `${s}/${max} giây`,
    denied: "Trình duyệt chưa cho phép dùng micro — hãy cho phép hoặc gõ câu hỏi.",
    unavailable: "Không tìm thấy micro — hãy gõ câu hỏi.",
    noSpeech: "Không nghe rõ giọng nói — hãy nói lại hoặc gõ câu hỏi.",
    notConfigured: "Nhận giọng nói chưa được cấu hình trên máy chủ — hãy gõ câu hỏi.",
    check: "Hãy kiểm tra lại câu chữ trước khi gửi.",
  },

  photo: {
    label: "Gửi ảnh thông báo thuế hoặc hoá đơn",
    attached: "Ảnh đính kèm",
    notConnected: "Bản mẫu: chưa đọc nội dung ảnh",
    remove: "Bỏ ảnh",
    reading: "Đang đọc ảnh…",
    readBy: "Muse Spark đọc từ ảnh — hãy đối chiếu với giấy gốc.",
    canned: "Kết quả đọc ảnh mẫu — không phải đọc trực tiếp",
    notTax: "Ảnh này có vẻ không phải giấy tờ thuế.",
    dateFound: (d: string) => `Ngày trên giấy: ${d}`,
    useQuestion: "Dùng câu hỏi này",
    dateApplied: (d: string) => `Đã đặt ngày áp dụng theo ảnh: ${d}`,
    tooLarge: "Ảnh quá lớn.",
    unsupported: "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
    notConfigured: "Đọc ảnh chưa được cấu hình trên máy chủ.",
    failed: "Không đọc được ảnh. Hãy thử lại hoặc gõ câu hỏi.",
    rateLimited: "Máy chủ đang bận — hãy thử lại sau ít phút.",
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

  relationBy: {
    sua_doi: "bị sửa đổi bởi",
    thay_the: "bị thay thế bởi",
    bai_bo: "bị bãi bỏ bởi",
    huong_dan: "được hướng dẫn bởi",
    dan_chieu: "được dẫn chiếu bởi",
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
    unresolved: "Vấn đề còn lại",
  },

  drawer: {
    supports: "Chứng minh cho",
    relations: "Văn bản tác động tới điều này",
    noRelations: "Trong kho chưa có văn bản nào sửa đổi điều này.",
    relFrom: (d: string) => `từ ${d}`,
    relPending: "chưa áp dụng tại ngày bạn chọn",
    backendStatus: "Máy chủ ghi nhận",
    close: "Đóng",
    document: "Văn bản",
    issued: "Ngày ban hành",
    effectiveFrom: "Hiệu lực từ",
    appliesFrom: "Áp dụng từ",
    effectiveUntil: "Hết hiệu lực",
    stillInForce: "—",
    page: "Trang",
    source: "Xem văn bản gốc",
    sourcePdf: (page: number) => `PDF gốc, trang ${page}`,
    sourcePage: "Trang văn bản",
    amendedBy: "Bị sửa đổi bởi",
    amends: "Sửa đổi",
    referredBy: "Được dẫn chiếu bởi",
    retroOnly: "áp dụng hồi tố",
    scope: {
      toan_muc: "toàn bộ điều khoản",
      thay_cum_tu: "thay cụm từ",
      mot_phan: "một phần",
      bo_sung: "bổ sung",
    },
    showAll: (n: number) => `Xem tất cả ${n}`,
    showLess: "Thu gọn",
    quote: "Câu được trích",
    articleText: "Nội dung điều khoản",
    chain: "Chuỗi sửa đổi",
    chainHint: "Văn bản có dấu kiểm và nhãn «Còn hiệu lực» là văn bản áp dụng tại ngày bạn chọn.",
    issuedRetro: (issued: string) => `ban hành ${issued} · áp dụng hồi tố`,
    retroactive: (issued: string, from: string) =>
      `Ban hành ${issued}, sau ngày áp dụng, nhưng có hiệu lực hồi tố từ ${from}. Cách tính hồi tố cần thống nhất với kế toán.`,
    illustrative: "Phản hồi mẫu — nội dung điều khoản trích nguyên văn từ PDF chính thức",
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
    errScanned:
      "Tệp PDF này không có lớp chữ (có thể là bản quét). Hãy dùng tệp PDF chọn được chữ.",
    errBadPdf: "Tệp này không phải PDF đọc được.",
    errNeedFile: "Máy chủ cần một tệp PDF. Hãy chọn một tệp PDF có lớp chữ.",
    errLimit: "Bản demo trực tiếp đang chạm giới hạn. Hãy thử lại sau, hoặc dùng phản hồi mẫu.",
    errDown: "Máy chủ trực tiếp không phản hồi. Hãy thử lại sau một phút.",
    replay: (n: string) =>
      `Phát lại lịch sử: ${/NĐ/.test(n) ? "Nghị định" : "văn bản"} ${n} được bổ sung vào kho`,
    issued: (d: string) => `Ban hành ${d}`,
    retroactive: (issued: string, from: string) =>
      `Ban hành ${issued}, nhưng áp dụng hồi tố từ ${from}. Cách tính hồi tố cần thống nhất với kế toán.`,
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

  bench: {
    title: "Kiểm thử: LexVi so với RAG thường",
    subtitle:
      "Cùng bộ câu hỏi, cùng kho điều khoản, cùng mô hình. Kết quả là số câu đếm được, không dùng phần trăm.",
    emptyTitle: "Chưa có kết quả",
    emptyBody: "Kết quả sẽ có sau khi chạy scripts/run_eval.py trên bộ câu hỏi do nhóm soạn.",
    byConstruction:
      "Bước nộp câu trả lời của LexVi từ chối trích dẫn không còn hiệu lực, nên số lần LexVi «dẫn điều cũ» bằng 0 theo thiết kế.",
    extra: {
      loi: "Lần chạy bị lỗi",
      khong_tra_loi: "Không đưa ra câu trả lời",
      id_bia: "Trích mã điều khoản không tồn tại",
    },
    rag: "RAG thường",
    lexvi: "LexVi",
    lower: "càng thấp càng tốt",
    higher: "càng cao càng tốt",
    reference: "để tham khảo",
    metrics: {
      dan_dieu_cu: "Trích điều không áp dụng tại ngày hỏi",
      dung_can_cu: "Dẫn đúng căn cứ",
      trich_sai: "Câu trích không khớp nguyên văn",
      can_xac_nhan: "Gắn nhãn cần kế toán xác nhận",
    },
    table: "Từng câu hỏi",
    colQ: "Câu hỏi",
    colDate: "Ngày áp dụng",
    outdated: "Dẫn điều cũ",
    notOutdated: "Không",
    footer: (n: number, model: string, date: string) =>
      `Bộ câu hỏi do nhóm soạn · ${n} câu · mô hình ${model} · chạy ngày ${date}`,
    source: "Tệp kết quả",
    note: "Mẫu nhỏ: hãy đọc như số đếm, không suy ra tỷ lệ chung.",
  },

  profilePage: {
    title: "Hồ sơ kinh doanh",
    subtitle: "LexVi gửi hồ sơ này kèm mọi câu hỏi và mọi văn bản mới bạn đưa vào.",
    saved: "Đã lưu hồ sơ.",
    stored: "Hồ sơ chỉ lưu trên trình duyệt này.",
    howTitle: "LexVi dùng thông tin này thế nào",
    how: {
      loaiHinh: "Cho biết nhóm quy định cần tra: hộ kinh doanh hay doanh nghiệp nhỏ.",
      doanhThu:
        "Được đối chiếu với các ngưỡng doanh thu, ví dụ mức không phải nộp thuế hoặc mức bắt buộc hoá đơn điện tử.",
      nganh: "Gửi kèm câu hỏi để tìm quy định đúng ngành.",
      diaBan: "Gửi kèm câu hỏi làm ngữ cảnh.",
    },
  },

  placeholder: {
    title: "Đang xây dựng",
    body: "Màn hình này sẽ có trong bản demo.",
    back: "Về Hỏi đáp",
  },
  landing: {
    place: "TP. Hồ Chí Minh · 06:40",
    title: "Đúng luật, đúng ngày.",
    sub: "Tra cứu thuế có trích dẫn cho hộ kinh doanh. LexVi chỉ trả lời theo văn bản còn hiệu lực vào ngày bạn hỏi, và mở đúng điều khoản đã dựa vào.",
    watch: "Xem video demo",
    try: "Dùng thử bản demo",
    tryLive: "hoặc dùng thử trực tiếp với Muse Spark →",
    builtOn: "Xây dựng trên Muse Spark · Meta Model API",
    builtOnFull: "Xây dựng trên Muse Spark · Muse Voice Transcribe · Meta Model API",
    scroll: "Cuộn xuống: buổi sáng của chú Minh",
    minh1: "Minh: “Năm nay mình có phải nộp thuế không đây?”",
    minh2: "Minh: “Trang này nói một trăm triệu. Trang kia năm trăm. Trang khác lại một tỷ.”",
    minh3: "Minh: “Đâu thể đúng hết được… lỡ mình làm sai thì sao?”",
    minh4: "Minh: “Hay hỏi AI xem sao.”",
    storyNote:
      "Câu chuyện dựa trên các thay đổi thuế năm 2026 · các ngưỡng lấy từ văn bản chính thức",
    search: "ngưỡng thuế hộ kinh doanh 2026",
    result: (n: number) => `kết quả ${n} · một trang web`,
    answers: [
      ["≤ 100 triệu đồng", "Thông tư 40/2021/TT-BTC"],
      ["≤ 200 triệu đồng", "Luật Thuế GTGT 48/2024/QH15"],
      ["≤ 500 triệu đồng", "Luật 149/2025/QH15"],
      ["≤ 1 tỷ đồng", "Nghị định 141/2026/NĐ-CP"],
    ],
    newsTag: "Tin tức · Khảo sát VCCI, 2026",
    newsStat: "66,8%",
    news: "hộ kinh doanh gặp khó khăn khi theo kịp chính sách mới",
    aiTitle: "Tìm kiếm AI",
    aiKind: "RAG thông thường",
    question:
      "Hộ cà phê doanh thu năm 700 triệu đồng: ngưỡng không chịu GTGT năm 2026 là 500 triệu hay 1 tỷ?",
    gloss: "",
    cited: "Nguồn được dẫn: Nghị định 68/2026/NĐ-CP, khoản 1–2 Điều 3",
    stamp: "Không còn hiệu lực",
    stampSub:
      "Nghị định 141/2026/NĐ-CP đã sửa cụm từ “500 triệu đồng” thành “01 tỷ đồng” tại Điều 3, từ 01/01/2026.",
    aiNote:
      "Kết quả thật từ bài kiểm thử của nhóm · câu A01 · cùng mô hình (muse-spark-1.3), RAG thông thường · 04/11/2026",
    arrive: "Tra cứu thuế có trích dẫn cho hộ kinh doanh",
    graphTitle: "Mỗi quy định có ngày bắt đầu, và chuỗi văn bản đã sửa đổi nó.",
    graphAlt:
      "Ảnh động: dòng thời gian 2021–2026 với Thông tư 40/2021, Luật 48/2024, Luật 149/2025 và Nghị định 141/2026. Con trỏ ngày 01/12/2025 làm nổi bật Thông tư 40 (≤ 100 triệu); ngày 04/11/2026 làm nổi bật Nghị định 141 (≤ 1 tỷ).",
    graphNote:
      "Các ngưỡng lấy từ văn bản chính thức · chấm tròn là ngày ban hành · Luật 09/2026/QH16 giao Chính phủ quy định mức; Nghị định 141/2026 sửa Nghị định 68/2026",
    tourNote:
      "Câu trả lời mẫu dựng từ văn bản chính thức · không phải kết quả trực tiếp · thông tin tham khảo, không phải tư vấn",
    tour: [
      {
        label: "Ngày của bạn",
        meta: "",
        caption: "LexVi chỉ trả lời theo các quy định còn hiệu lực vào ngày bạn chọn.",
      },
      {
        label: "Kiểm chứng trước khi trả lời",
        meta: "Chạy bằng Muse Spark",
        caption:
          "Hệ thống kiểm tra từng trích dẫn bằng mã: điều khoản có thật, còn hiệu lực ngày đó, câu trích khớp nguyên văn; rồi Muse Spark đánh giá lại. Ở đây nó bắt được một khoản đã cũ và tự sửa.",
      },
      {
        label: "Chính điều khoản đó",
        meta: "ngày ban hành · chuỗi sửa đổi",
        caption:
          "Mỗi câu trả lời mở ra điều khoản gốc: ngày ban hành, ngày áp dụng và chuỗi văn bản đã sửa đổi nó.",
      },
      {
        label: "Biết giới hạn",
        meta: "không phải tư vấn · kế toán xác nhận",
        caption:
          "Khi các văn bản chưa thống nhất, LexVi nói rõ: sau ba lần kiểm chứng không đạt, câu trả lời được gắn nhãn “cần kế toán xác nhận”.",
      },
      {
        label: "Hỏi bằng giọng nói hoặc ảnh",
        meta: "Muse Voice Transcribe · Muse Spark",
        caption:
          "Nói câu hỏi, hoặc chụp thông báo thuế. Muse Voice Transcribe và Muse Spark chuyển thành câu hỏi.",
      },
    ],
    proofKicker: "Trước khi tin dùng cho chuyện thuế",
    proofTitle: "20 câu hỏi thật, hai hệ thống",
    plain: "Tìm kiếm AI thông thường",
    plainShort: "AI thường",
    lexvi: "LexVi",
    outdated: "dẫn quy định hết hiệu lực",
    basis: "đúng căn cứ pháp lý",
    markOut: "✕ đã hết hiệu lực",
    markBasis: "✕ chưa đúng căn cứ",
    markOk: "✓",
    byDesign: "Số 0 của LexVi là do thiết kế: nó từ chối trích dẫn không còn hiệu lực.",
    proofLink: "Xem toàn bộ kết quả kiểm thử",
    proofNote:
      "Bộ câu hỏi do nhóm soạn · N = 20 (11 câu bẫy về ngày) · cùng mô hình muse-spark-1.3 · chạy ngày 04/11/2026",
    savedSub: "mỗi năm, không phải nộp",
    savedLine:
      "Minh: “Khoảng hai mươi bốn triệu một năm. Suýt nữa tôi nộp theo một quy định đã hết hiệu lực.”",
    calling: "Đang gọi · kế toán của tôi…",
    callLine: "Minh: “Alô, Minh đây. Chị xác nhận giúp tôi được không?”",
    savedNote:
      "Ước tính minh hoạ, nếu tính như dịch vụ gắn với hàng hoá: GTGT 3% (Luật 48/2024, Điều 12) + TNCN 1,5% phần trên 500 triệu (Luật 109/2025, Điều 7) · cần kế toán xác nhận",
    finalTitle: "LexVi. Đúng luật, đúng ngày.",
    roles:
      "Yoshio — sản phẩm, giao diện & phim · Tuấn Anh — agent & kiểm chứng · Dũng — dữ liệu & đồ thị luật",
    honesty:
      "Câu chuyện dựa trên các quy định năm 2026. Bản demo dùng câu trả lời mẫu dựng từ văn bản chính thức; kết quả kiểm thử lấy từ hệ thống chạy thật. Thông tin tham khảo, không phải tư vấn.",
    made: "Làm trong Meta Global AI Developer Hackathon, 2026",
    videoTitle: "Video demo LexVi",
    videoClose: "Đóng video",
    videoNote: "Lời thoại tiếng Anh, có phụ đề.",
    pause: "Tạm dừng",
    play: "Phát",
    pauseLoop: "Tạm dừng ảnh động",
    playLoop: "Phát ảnh động",
    docTitle: "LexVi — Đúng luật, đúng ngày",
  },
} as const;
