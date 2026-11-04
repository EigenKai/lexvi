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
    elapsed: (s: number) => `${s} s`,
    runMeta: (steps: number, secs: number) => `${steps} steps · ${secs} s`,
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
    stop: "Stop recording",
    seconds: (s: number, max: number) => `${s}/${max} s`,
    denied: "The browser hasn't allowed the microphone — allow it, or type your question.",
    unavailable: "No microphone found — please type your question.",
    noSpeech: "Couldn't hear any speech — try again, or type your question.",
    notConfigured: "Voice input isn't configured on the server — please type your question.",
    check: "Check the words before sending.",
  },

  photo: {
    label: "Send a photo of a tax notice or invoice",
    attached: "Photo attached",
    notConnected: "Demo: photo content is not read yet",
    remove: "Remove photo",
    reading: "Reading the photo…",
    readBy: "Read by Muse Spark — check it against your paper.",
    notTax: "This photo doesn't look like a tax document.",
    dateFound: (d: string) => `Date on the paper: ${d}`,
    useQuestion: "Use this question",
    dateApplied: (d: string) => `Applied date set from the photo: ${d}`,
    tooLarge: "The photo is too large.",
    unsupported: "Only JPG, PNG or WebP photos.",
    notConfigured: "Photo reading isn't configured on the server.",
    failed: "Couldn't read the photo. Try again, or type your question.",
    rateLimited: "The server is busy — try again in a few minutes.",
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

  relationBy: {
    sua_doi: "amended by",
    thay_the: "replaced by",
    bai_bo: "repealed by",
    huong_dan: "guided by",
    dan_chieu: "referred to by",
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
    unresolved: "Remaining issues",
  },

  drawer: {
    supports: "Supports the claim",
    relations: "Documents acting on this article",
    noRelations: "No stored document amends this article.",
    relFrom: (d: string) => `from ${d}`,
    relPending: "not yet applicable on your date",
    backendStatus: "Server says",
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

  bench: {
    title: "Benchmark: LexVi vs plain RAG",
    subtitle:
      "Same questions, same stored articles, same model. Results are counts of questions, not percentages.",
    emptyTitle: "No results yet",
    emptyBody:
      "Results appear after scripts/run_eval.py runs on the team-written test set, once the legal corpus is loaded.",
    rag: "Plain RAG",
    lexvi: "LexVi",
    lower: "lower is better",
    higher: "higher is better",
    reference: "for reference",
    metrics: {
      dan_dieu_cu: "Cited an article not in force on the date",
      dung_can_cu: "Cited the correct legal basis",
      trich_sai: "Quote not verbatim",
      can_xac_nhan: "Flagged for an accountant",
    },
    table: "Per question",
    colQ: "Question",
    colDate: "Applied on",
    outdated: "Cited outdated",
    notOutdated: "No",
    footer: (n: number, model: string, date: string) =>
      `Team-written test set · ${n} questions · model ${model} · run on ${date}`,
    source: "Results file",
    note: "Small sample: read these as counts, not general rates.",
  },

  profilePage: {
    title: "Business profile",
    subtitle: "LexVi sends this profile with every question and every new document you add.",
    saved: "Profile saved.",
    stored: "The profile is stored in this browser only.",
    howTitle: "How LexVi uses this",
    how: {
      loaiHinh:
        "Tells LexVi which set of rules to look up: household business or small enterprise.",
      doanhThu:
        "Compared with revenue thresholds, such as the tax-exempt level or the e-invoice requirement.",
      nganh: "Sent with your question so the rules for your sector are found.",
      diaBan: "Sent with your question as context.",
    },
  },

  placeholder: {
    title: "Under construction",
    body: "This screen will be in the demo.",
    back: "Back to Ask",
  },
};
