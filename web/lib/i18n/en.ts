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
    home: "Home",
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

  sourceNote: "Quoted legal text stays in Vietnamese, the language of the source law.",

  skipToContent: "Skip to main content",

  notFound: { title: "This page doesn't exist." },

  mockBadge: "Prepared example responses · not live output",
  mockNote:
    "Built from the real legal corpus: article texts are verbatim from the official PDFs, but these answers were prepared for the demo, not produced live by the system.",
  mockFlag: "Prepared example",
  live: {
    badge: "Live · Muse Spark",
    checking: "Connecting to the live server…",
    waking: "Waking the live server (free hosting). This takes about a minute…",
    ready:
      "Answers come live from Muse Spark, in Vietnamese, and take about a minute. Limited per visitor.",
    down: "The live server isn't responding. Try again in a minute, or use the prepared examples.",
    toPrepared: "Prepared examples (instant) →",
    tryLive: "Try it live →",
  },
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
    suggestions: "Sample questions",
    searching: "Finding the articles in force on the applied date…",
    error: "Couldn't get an answer. Please try again.",
    errTimeout: "The server took too long to answer. Please try again.",
    errLength: "A question needs 3 to 2,000 characters.",
    errLimit:
      "The live demo is at its limit right now. Try again later, or use the prepared examples.",
    errDown: "The live server didn't respond. Try again in a minute.",
    tooLong: (n: number) => `${n.toLocaleString("en-US")} / 2,000 characters`,
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
    error: "Couldn't transcribe — try again, or type your question",
    canned: "Example recording — not a live transcription",
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
    canned: "Example photo reading — not live",
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
    sourcePdf: (page: number) => `Source PDF, p. ${page}`,
    sourcePage: "Document page",
    amendedBy: "Amended by",
    amends: "Amends",
    referredBy: "Referred to by",
    retroOnly: "applies retroactively",
    scope: {
      toan_muc: "whole provision",
      thay_cum_tu: "replaces a phrase",
      mot_phan: "in part",
      bo_sung: "adds text",
    },
    showAll: (n: number) => `Show all ${n}`,
    showLess: "Show fewer",
    quote: "Quoted sentence",
    articleText: "Article text",
    chain: "Amendment chain",
    chainHint:
      "The document with the check mark and the “In force” label applies on the date you chose.",
    issuedRetro: (issued: string) => `issued ${issued} · applies retroactively`,
    retroactive: (issued: string, from: string) =>
      `Issued ${issued}, after the applied date, but in force retroactively from ${from}. How to apply this retroactively should be agreed with an accountant.`,
    illustrative: "Prepared example — article text is verbatim from the official PDF",
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
    errScanned:
      "This PDF has no text layer (it may be a scan). Please use a PDF with selectable text.",
    errBadPdf: "This file isn't a readable PDF.",
    errNeedFile: "The server needs a PDF file. Please choose a PDF with a text layer.",
    errLimit:
      "The live demo is at its limit right now. Try again later, or use the prepared examples.",
    errDown: "The live server didn't respond. Try again in a minute.",
    replay: (n: string) =>
      `Historical replay: ${/NĐ/.test(n) ? "Decree" : "document"} ${n} added to the corpus`,
    issued: (d: string) => `Issued ${d}`,
    retroactive: (issued: string, from: string) =>
      `Issued ${issued}, but applies retroactively from ${from}. How to apply this retroactively should be agreed with an accountant.`,
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
    emptyBody: "Results appear after scripts/run_eval.py runs on the team-written test set.",
    byConstruction:
      "LexVi's submit step refuses citations not in force, so its 'cited outdated law' count is 0 by construction.",
    extra: {
      loi: "Run crashed",
      khong_tra_loi: "No answer given",
      id_bia: "Cited a provision id that doesn't exist",
    },
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
  landing: {
    place: "Ho Chi Minh City · 06:40",
    title: "The right law, on the right day.",
    sub: "Tax lookup with citations for Vietnamese household businesses. LexVi answers only from the rules in force on the date you ask, and opens the exact article it relied on.",
    watch: "Watch the demo",
    try: "Try the demo",
    tryLive: "or try it live with Muse Spark →",
    builtOn: "Built on Muse Spark · Meta Model API",
    builtOnFull: "Built on Muse Spark · Muse Voice Transcribe · Meta Model API",
    scroll: "Scroll: Mr. Minh's morning",
    minh1: "Minh: “Do I pay tax this year, or not?”",
    minh2:
      "Minh: “One site says a hundred million. Another says five hundred. Another, one billion.”",
    minh3: "Minh: “They can't all be right. And if I get it wrong…”",
    minh4: "Minh: “Maybe the AI knows.”",
    storyNote: "A story based on Vietnam's 2026 tax changes · thresholds from the official texts",
    search: "household tax threshold 2026",
    result: (n: number) => `result ${n} · a website`,
    answers: [
      ["≤ 100 million VND", "Circular 40/2021/TT-BTC"],
      ["≤ 200 million VND", "VAT Law 48/2024/QH15"],
      ["≤ 500 million VND", "Law 149/2025/QH15"],
      ["≤ 1 billion VND", "Decree 141/2026/NĐ-CP"],
    ],
    newsTag: "News · VCCI survey, 2026",
    newsStat: "66.8%",
    news: "of household businesses struggle to keep up with new policy updates",
    aiTitle: "AI search",
    aiKind: "plain RAG",
    question:
      "My café makes 700 million a year. Is the 2026 VAT threshold 500 million or 1 billion?",
    gloss: "“The 2026 threshold is 500 million, not 1 billion. A 700-million café must pay VAT.”",
    cited: "Source cited: Decree 68/2026/NĐ-CP, Art. 3(1)–(2)",
    stamp: "No longer in force",
    stampSub:
      "Decree 141/2026/NĐ-CP changed “500 million” to “1 billion” in Art. 3, from 01/01/2026.",
    aiNote:
      "Real output from our team test · question A01 · same model (muse-spark-1.3), plain RAG · 04/11/2026",
    arrive: "Tax lookup with citations, for household businesses",
    graphTitle: "Every rule knows the day it starts, and the laws that changed it.",
    graphAlt:
      "Animation: a 2021–2026 timeline with Circular 40/2021, VAT Law 48/2024, Law 149/2025 and Decree 141/2026. The date cursor at 01/12/2025 lights Circular 40 (≤ 100 million); at 04/11/2026 it lights Decree 141 (≤ 1 billion).",
    graphNote:
      "Thresholds from the official texts · dots mark issue dates · Law 09/2026/QH16 let the Government set the figure; Decree 141/2026 amended Decree 68/2026",
    tourNote:
      "Prepared example responses built from the official texts · not live output · reference information, not advice",
    tour: [
      {
        label: "Your date",
        meta: "",
        caption: "LexVi answers only from the rules in force on the date you choose.",
      },
      {
        label: "Checked before it answers",
        meta: "Powered by Muse Spark",
        caption:
          "Code checks every citation: the article exists, it is in force that day, the quote is word for word. Then a second Muse Spark review. Here it caught an outdated clause and fixed it.",
      },
      {
        label: "The article itself",
        meta: "dates · amendment chain",
        caption:
          "Every answer opens the article: when it was issued, when it applies, and the chain of laws that changed it.",
      },
      {
        label: "Guardrails",
        meta: "not advice · an accountant confirms",
        caption:
          "When the texts disagree, it says so: after three failed checks the answer is marked “needs accountant confirmation”.",
      },
      {
        label: "Ask by voice or photo",
        meta: "Muse Voice Transcribe · Muse Spark",
        caption:
          "Speak the question, or snap the tax notice. Muse Voice Transcribe and Muse Spark turn it into a question.",
      },
    ],
    proofKicker: "Before trusting it with his taxes",
    proofTitle: "20 real questions, two systems",
    plain: "Plain AI search",
    plainShort: "Plain",
    lexvi: "LexVi",
    outdated: "cited a rule no longer in force",
    basis: "right legal basis",
    markOut: "✕ outdated",
    markBasis: "✕ no right basis",
    markOk: "✓",
    byDesign: "LexVi's 0 is by design: it refuses citations not in force.",
    proofLink: "See the full benchmark",
    proofNote:
      "Team-written test set · N = 20 (11 date traps) · same model: muse-spark-1.3 · run 04/11/2026 · questions shown in English translation",
    savedSub: "a year, not owed",
    savedLine:
      "Minh: “About twenty-four million a year. I almost paid for a rule that no longer applied.”",
    calling: "Calling · my accountant…",
    callLine: "Minh: “Hello, it's Minh. Can you confirm this for me?”",
    savedNote:
      "Illustrative estimate, if taxed as services tied to goods: VAT 3% (Law 48/2024, Art. 12) + PIT 1.5% above 500 million (Law 109/2025, Art. 7) · confirm with an accountant",
    finalTitle: "LexVi. The right law, on the right day.",
    roles:
      "Yoshio — product, UI & film · Tuấn Anh — agent & verification · Dũng — data & law graph",
    honesty:
      "A story based on the 2026 rules. The demo shows prepared example responses built from the official texts; the benchmark comes from the live system. Reference information, not advice.",
    made: "Made during the Meta Global AI Developer Hackathon, 2026",
    videoTitle: "LexVi demo film",
    videoClose: "Close video",
    videoNote: "English narration, with captions.",
    pause: "Pause",
    play: "Play",
    pauseLoop: "Pause the animation",
    playLoop: "Play the animation",
    docTitle: "LexVi — The right law, on the right day",
  },
};
