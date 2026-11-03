import type { Dict } from "./index";

/**
 * Every UI string, English. Same shape as `vi.ts` (enforced by `Dict`).
 * Never use "advice", "guarantee" or "100% accurate" — the only exception is the mandated
 * disclaimer (DESIGN.md §4.13), which says LexVi is *not* advice.
 */
export const en: Dict = {
  brand: "LexVi",
  tagline: "Tax lookup with citations",

  nav: {
    ask: "Ask",
    alerts: "Alerts",
    profile: "Profile",
    benchmark: "Benchmark",
    label: "Main navigation",
  },

  lang: {
    label: "Language",
    en: "EN",
    vi: "VI",
    enName: "English",
    viName: "Tiếng Việt",
  },

  disclaimer: {
    full: "Reference information with citations, not advice. Confirm with an accountant or the tax authority.",
    short:
      "Reference information with citations — confirm with an accountant or the tax authority.",
  },

  sourceNote: "Answers and legal text are shown in Vietnamese, the language of the source law.",

  mockBadge: "Illustrative data · not connected to the server",
  mockNote:
    "Figures, articles and deadlines in this demo have not been checked against the original texts.",
  mockFlag: "Illustrative data",
  openArticle: "Open article",
  answerReady: "Answer ready.",

  ask: {
    title: "Ask about your shop's taxes",
    subtitle:
      "Answers rely only on rules in force on the date you choose, with the original article cited.",
    placeholder: "Ask about your shop's taxes…",
    inputLabel: "Question",
    send: "Send question",
    more: "More input options",
    suggestions: "Sample questions (in Vietnamese)",
    searching: "Finding the articles in force on the applied date…",
    error: "Couldn't get an answer. Please try again.",
    empty: "Type a question or pick a sample question to start.",
  },

  appliedDate: {
    label: "Applied on",
    today: "Today",
    change: "Change the applied date",
    tryOther: "Try another date:",
  },

  mic: {
    idle: "Ask by voice",
    listening: "Listening…",
    transcribing: "Transcribing your voice…",
    error: "No voice detected — please type your question",
  },

  photo: {
    label: "Send a photo of a tax notice or invoice",
    attached: "Photo attached",
    notConnected: "Demo: photo content is not read yet",
    remove: "Remove photo",
  },

  profile: {
    chipLabel: "Business profile",
    edit: "Edit profile",
    title: "Business profile",
    description: "Every answer depends on this profile.",
    loaiHinh: "Business type",
    nganh: "Sector",
    doanhThu: "Annual revenue (VND)",
    diaBan: "Location",
    save: "Save profile",
    perYear: "/year",
    loai: { ho_kinh_doanh: "Household business", doanh_nghiep_nho: "Small enterprise" },
  },

  answer: {
    heading: "Answer",
    citations: "Legal basis",
    checklist: "To do",
    noChecklist: "Nothing else to do for this question.",
    forDate: "Applied on",
    accountantStep: "Last step: have an accountant or the tax authority confirm before you act.",
  },

  status: {
    con_hieu_luc: "In force",
    da_sua_doi: "Amended",
    het_hieu_luc: "No longer in force",
    can_xac_nhan: "Needs accountant confirmation",
    huong_dan: "Guidance",
    verified: "Verified",
    notYet: "Not yet in force",
  },

  relation: {
    sua_doi: "amends",
    thay_the: "replaces",
    bai_bo: "repeals",
    huong_dan: "guides",
    dan_chieu: "refers to",
  },

  verify: {
    title: "Checked before answering",
    attempt: (n: number, max: number) => `attempt ${n}/${max}`,
    steps: {
      ton_tai: "Article exists",
      con_hieu_luc: "In force on the applied date",
      khop_nguyen_van: "Quote matches verbatim",
      mo_hinh_danh_gia: "Model checks each claim",
    },
    running: "Checking",
    passed: "Passed",
    failed: "Failed",
    skipped: "Not run",
    reason: "Reason",
    sentBack: "sent back to fix",
    allPassed: "Verified: every citation exists, is in force and matches the source verbatim.",
    gaveUp: "Not passed after 3 attempts — needs accountant confirmation.",
    notPassed: "Verification not passed — needs accountant confirmation.",
    statusNeedsConfirm:
      "All checks passed, but a cited article is not in force on the applied date — needs accountant confirmation.",
    finalOnly: "The server returned the final result only.",
  },

  drawer: {
    close: "Close",
    document: "Document",
    issued: "Issued",
    effectiveFrom: "In force from",
    appliesFrom: "Applies from",
    effectiveUntil: "In force until",
    stillInForce: "—",
    page: "Page",
    source: "View the original document",
    quote: "Quoted sentence",
    articleText: "Article text",
    chain: "Amendment chain",
    chainHint:
      "The document with the check mark and the “In force” label applies on the date you chose.",
    issuedRetro: (issued: string) => `issued ${issued} · applies retroactively`,
    retroactive: (issued: string, from: string) =>
      `Issued ${issued}, after the applied date, but in force retroactively from ${from}. How to apply this retroactively should be agreed with an accountant.`,
    illustrative: "Illustrative content — not checked against the original text",
    loading: "Loading article…",
    noDetail: "The server has not returned the article details.",
  },

  due: {
    overdue: (n: number) => `${n} days overdue`,
    today: "due today",
    left: (n: number) => `${n} days left`,
    noDeadline: "No deadline stated",
    basis: "Basis",
    markDone: "Mark as done",
  },

  impact: {
    title: "New regulation affecting you",
    subtitle:
      "Drop in a new legal document (PDF). LexVi finds the articles it changes, checks them against your profile and lists what to do.",
    dropTitle: "Drag and drop a PDF here",
    dropHint: "PDF with a text layer, up to 20 MB",
    choose: "Choose a PDF",
    sample: "Use the sample document",
    sampleName: "sample-document.pdf",
    scanning: "Reading the document…",
    scanningHint: "Matching each change against the stored articles and your profile.",
    errNotPdf: "This file is not a PDF. Please choose a PDF with a text layer.",
    errTooBig: "The file is larger than 20 MB.",
    errFailed: "Couldn't read the document. Please try again.",
    errNeedFile:
      "The server needs a real PDF; the sample document only works with illustrative data.",
    newDoc: "New document",
    appliesFrom: (d: string) => `Applies from ${d}`,
    affectedCount: (n: number, total: number) => `${n} of ${total} changes affect your business`,
    changes: "Articles changed",
    before: "Before",
    after: "New text",
    affects: "Affects your business",
    notAffects: "Does not affect your business",
    tasks: "To do",
    noTasks: "Nothing to do for this profile.",
    dropped: (n: number) => `${n} ${n === 1 ? "change" : "changes"} dropped: could not be verified`,
    droppedHint:
      "LexVi only shows changes whose excerpt appears verbatim in the new document and that point to a stored article.",
    another: "Read another document",
  },

  placeholder: {
    title: "Under construction",
    body: "This screen will be in the demo.",
    back: "Back to Ask",
  },
};
