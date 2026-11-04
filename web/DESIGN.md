# DESIGN.md — LexVi web UI

> Design system for the LexVi web app (Meta Global AI Developer Hackathon, Nov 2026).
> Format: the 9-section Google Stitch / VoltAgent awesome-design-md layout, plus §10 Motion, §11 Screens and
> §12 Content rules, because this product is motion-heavy and legally sensitive.
> Every colour pair below was contrast-checked (WCAG 2.2 relative-luminance formula) on 2026-11-03; the ratio is
> written next to it. If you change a colour, recompute the ratio and update this file in the same commit.
> Lives at `code/lexvi-web/DESIGN.md` once the app is scaffolded (copy it into the repo root so teammates'
> agents see it too). The workspace copy at `Meta AI Hackathon/DESIGN.md` is the source until then.

---

## 1. Visual theme & atmosphere

**Name of the look: "Ink & Jade" (Mực & Ngọc).**

- The product is a legal lookup tool for a tired, non-expert user (persona: a 50-year-old café owner in
  Ho Chi Minh City). It must feel **calm, official and certain** — closer to a well-set statute book than to a
  chatbot. Trust comes from typography, whitespace and visible verification, not from decoration.
- Base: warm **paper** background, near-black **ink** text, one deep **ink-blue** brand colour.
- The only "loud" colours are the **legal-status colours** (in force / amended / expired / needs confirmation).
  They carry meaning, so they are never used decoratively.
- **Lacquer gold** (a nod to Vietnamese sơn mài) is the single decorative accent: thin rules, the verification
  "seal" glint, focus of the hero. Never for text below 24 px, never for status.
- Motion is purposeful: things **settle like ink on paper** — short rises and fades; connector lines draw
  themselves; repealed text is struck through, then recedes. Motion always explains state (verification in
  progress, amendment chain, new-document impact); it never loops for its own sake inside the app.
- Two surfaces:
  - **App (light, "paper")** — everything a user works in. Default.
  - **Stage (dark, "night ink")** — landing hero, problem/stat section, video title cards, the benchmark panel.
    Used for drama in the demo; never for reading statute text at length.

## 2. Colour palette & roles

All hex values are sRGB. Use them through CSS variables / Tailwind v4 `@theme` tokens, never as literals in
components. Ratios are against the background named.

### 2.1 Light ("paper") — app default

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--paper` | `#FAF8F3` | page background | — |
| `--surface` | `#FFFFFF` | cards, drawers, inputs | — |
| `--surface-sunk` | `#F2EFE7` | statute text block background, code/ID wells | — |
| `--line` | `#E3DED3` | **decorative** dividers only (1.26:1 — never the only boundary of a control) | 1.26 on paper |
| `--line-strong` | `#7D8698` | input borders, control outlines, focus-adjacent boundaries | 3.45 on paper · 3.66 on surface ✅ 1.4.11 |
| `--ink` | `#0E1726` | primary text, headings | 16.92 on paper · 17.96 on surface ✅ AAA |
| `--ink-2` | `#3D4A5C` | secondary text | 8.48 on paper · 9.00 on surface ✅ AAA |
| `--ink-3` | `#5E6A7D` | muted text, metadata, timestamps | 5.16 on paper · 5.48 on surface ✅ AA |
| `--brand` | `#1D3A8A` | primary buttons, links, active nav, brand mark | 9.77 on paper · white on brand 10.37 ✅ |
| `--brand-tint` | `#E8EDFA` | selected rows, brand chips (brand text on it 8.85) | — |
| `--gold` | `#9C7A14` | decorative accent, seal glint, hairline rules; as a non-text mark it passes 3:1 | 3.80 on paper · 4.03 on surface |

### 2.2 Legal-status colours (semantic — the core of the product)

Each status has a **text/icon colour** and a **tint background**. Status is never colour-only: always pair it
with an icon **and** a word (WCAG 1.4.1).

| Status (vi / en) | Token | Text/icon | Tint bg | Text on tint | Icon (lucide) |
|---|---|---|---|---|---|
| Còn hiệu lực / In force, verified | `--jade` | `#0B6E52` (6.24 on white) | `#E2F3EC` | 5.43 ✅ | `BadgeCheck` |
| Đã sửa đổi / Amended (chain link) | `--amend` | `#5B3FB8` (7.37 on white) | `#EFEBFB` | 6.30 ✅ | `GitCommitHorizontal` / `Link2` |
| Hết hiệu lực / Bãi bỏ / Expired, repealed | `--crimson` | `#B42318` (6.57 on white) | `#FDECEA` | 5.75 ✅ | `CircleSlash` + strikethrough |
| Cần kế toán xác nhận / Needs accountant confirmation | `--amber` | `#8A5300` (6.33 on white) | `#FFF1D6` | 5.67 ✅ | `TriangleAlert` / `UserCheck` |
| Hướng dẫn / Guidance (decree/circular guiding a law) | `--brand` | `#1D3A8A` | `#E8EDFA` | 8.85 ✅ | `BookOpen` |

White text on `--jade` (6.24) and `--crimson` (6.57) is allowed for solid badges.

### 2.3 Dark ("night ink") — stage surfaces only

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--night` | `#0A0F1A` | stage background | — |
| `--night-surface` | `#121A2A` | cards on stage | — |
| `--night-line` | `#62708A` | control boundaries on stage | 3.84 on night · 3.48 on surface ✅ |
| `--night-text` | `#E8ECF2` | primary text | 16.16 · 14.68 ✅ |
| `--night-muted` | `#A3AEC0` | secondary text | 8.55 · 7.77 ✅ |
| `--night-brand` | `#8FA8FF` | links, highlights | 8.40 · 7.63 ✅ |
| `--night-jade` | `#3DD6A3` | in force | 10.35 · 9.40 ✅ |
| `--night-amber` | `#F5B547` | needs confirmation | 10.57 · 9.60 ✅ |
| `--night-crimson` | `#FF7A6E` | expired | 7.54 · 6.84 ✅ |
| `--night-amend` | `#B8A4FF` | amended | 8.93 · 8.11 ✅ |
| `--night-gold` | `#E6C35C` | accent, big numerals in stat cards | 11.24 · 10.21 ✅ |

### 2.4 Tailwind v4 tokens (paste into `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-paper: #FAF8F3;
  --color-surface: #FFFFFF;
  --color-surface-sunk: #F2EFE7;
  --color-line: #E3DED3;
  --color-line-strong: #7D8698;
  --color-ink: #0E1726;
  --color-ink-2: #3D4A5C;
  --color-ink-3: #5E6A7D;
  --color-brand: #1D3A8A;
  --color-brand-tint: #E8EDFA;
  --color-gold: #9C7A14;

  --color-jade: #0B6E52;      --color-jade-tint: #E2F3EC;
  --color-amend: #5B3FB8;     --color-amend-tint: #EFEBFB;
  --color-crimson: #B42318;   --color-crimson-tint: #FDECEA;
  --color-amber: #8A5300;     --color-amber-tint: #FFF1D6;

  --color-night: #0A0F1A;
  --color-night-surface: #121A2A;
  --color-night-line: #62708A;
  --color-night-text: #E8ECF2;
  --color-night-muted: #A3AEC0;
  --color-night-brand: #8FA8FF;
  --color-night-jade: #3DD6A3;
  --color-night-amber: #F5B547;
  --color-night-crimson: #FF7A6E;
  --color-night-amend: #B8A4FF;
  --color-night-gold: #E6C35C;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* House easing triple — identical to Pyrium motion/theme.ts and the Ignis film (see §10). */
  --ease-settle: cubic-bezier(0.16, 1, 0.3, 1);    /* entrances: expo-out, soft landing */
  --ease-smooth: cubic-bezier(0.45, 0, 0.2, 1);    /* camera moves, lines drawing, strike-throughs */
  --ease-exit: cubic-bezier(0.7, 0, 0.84, 0);      /* leaving: accelerate away */
  --ease-ui: cubic-bezier(0.23, 1, 0.32, 1);       /* user-triggered feedback ≤ 220 ms (Unfound) */
}

/* next/font sets these variables on <html>, so the theme must reference them inline (same as Pyrium). */
@theme inline {
  --font-display: var(--font-be-vietnam-pro), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-ibm-plex-mono), ui-monospace, monospace;
  --font-serif: var(--font-source-serif), Georgia, serif;
}
```

If shadcn/ui is used, map its OKLCH variables (`--background`, `--foreground`, `--primary`, `--border`,
`--ring` …) onto these tokens in `@theme inline` instead of keeping shadcn's default neutral palette.

## 3. Typography rules

All families are free (SIL Open Font License) and ship a **Vietnamese** subset (verified 2026-11-03 via the
Fontsource mirrors of Google Fonts). **Do not use Sora or Geist Sans** — no Vietnamese subset.

| Role | Family | Weights | Use |
|---|---|---|---|
| Display | **Be Vietnam Pro** (static) | 500, 600, 700 | headings, stat numerals, hero, video titles |
| Body / UI | **Inter** (variable) | 400–600 | all UI text, answers, buttons |
| Mono | **IBM Plex Mono** (static) | 400, 500 | citation IDs (`Điều 4 · Luật 48/2024/QH15`), document numbers, dates in chain nodes |
| Statute | **Source Serif 4** (optional) | 400, 600 | quoted article text inside the citation drawer only |

House preference: **no JetBrains Mono** (the Pyrium brief bans it; IBM Plex Mono is the mono already used in
the Neotels prototype). Be Vietnam Pro is also the Neotels display face.

```ts
// app/fonts.ts
import { Be_Vietnam_Pro, IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";
export const display = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["300", "400", "500", "600", "700"], variable: "--font-be-vietnam-pro" });
export const sans = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });
export const mono = IBM_Plex_Mono({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], variable: "--font-ibm-plex-mono" });
export const serif = Source_Serif_4({ subsets: ["latin", "vietnamese"], variable: "--font-source-serif" });
```

Headline weight follows the house style (Pyrium/Dialog: light, quiet, large): **display sizes ≥ 32 px use
Be Vietnam Pro 300–400 with −0.01em tracking**; anything below 32 px uses 600 so Vietnamese diacritics stay
legible. Emphasis inside a headline comes from colour (ink-3 → ink), not from weight (Unfound's move).

Type scale (rem at 16 px root):

| Token | Size / line-height | Family / weight | Use |
|---|---|---|---|
| `display-xl` | 3.5 / 1.15, −0.01em | display 300 | hero headline (stage only) |
| `display-l` | 2.5 / 1.2, −0.01em | display 300–400, tabular | stat numerals (Odometer), section titles |
| `h1` | 2 / 1.3 | display 400 | screen titles |
| `h2` | 1.375 / 1.35 | display 600 | card titles |
| `body-l` | 1.125 / 1.6 | sans 400 | the short answer (`tra_loi`) |
| `body` | 1 / 1.6 | sans 400 | default |
| `small` | 0.875 / 1.5 | sans 500 | metadata, badges |
| `mono` | 0.875 / 1.5 | mono 500 | citation IDs, document numbers |
| `statute` | 1.0625 / 1.7 | serif 400 | quoted article text |

Rules:
- **Line-height ≥ 1.5 for any Vietnamese running text** — stacked diacritics (ặ, ổ, ữ) clip otherwise. Never set
  `leading-none`/`leading-tight` on Vietnamese text below display sizes.
- Never letter-space Vietnamese body text; tracking only on all-caps English micro-labels.
- No all-caps for Vietnamese (diacritics on capitals become illegible at small sizes).
- Numbers that the user compares (revenue, thresholds, fines, counts) use `font-variant-numeric: tabular-nums`.
- VND formatting: `Intl.NumberFormat("vi-VN")` → `500.000.000 ₫`; dates `dd/MM/yyyy` (vi) — the API sends ISO.

## 4. Component stylings

All components: keyboard reachable, visible focus ring (`2px solid var(--color-brand)`, offset 2 px; on stage
`--night-brand`), hit area ≥ 44×44 px.

1. **AskBar** — the primary input. Large (min-height 64 px), surface bg, `--line-strong` border, radius-lg.
   Left: profile chip (see 6). Centre: textarea, placeholder "Hỏi về thuế của quán bạn…". Right: mic button,
   photo button, send button (brand, solid). Below it: **"Áp dụng tại ngày"** date picker, default today —
   this is the product's key idea; it must be visible, not hidden in settings.
2. **AnswerCard** — the short answer in `body-l`, max ~3 sentences, then a row of CitationChips, then the
   Checklist. Top-right: overall status badge (verified ✅ jade, or needs-confirmation ⚠ amber).
3. **CitationChip** — mono text `Điều 4 khoản 2 · NĐ 70/2025/NĐ-CP` [ILLUSTRATIVE], pill, status-tinted bg,
   status icon left. Click/Enter opens the CitationDrawer. Expired citations never appear as chips in a verified
   answer — if one does, the whole answer must show needs-confirmation.
4. **CitationDrawer** — right-side sheet (bottom sheet on mobile), 480 px. Contains: document title, number, issue
   date, effective-from/to, status badge; the quoted sentence (`cau_trich`) highlighted inside the full article
   text (statute serif on `--surface-sunk`); page number; source link (`nguon_url`); the AmendmentChain; the
   VerificationRibbon.
5. **AmendmentChain** — horizontal timeline (vertical on mobile). Nodes = documents in order of effect, mono
   number + effective date; edges labelled `sửa đổi` / `thay thế` / `bãi bỏ` / `hướng dẫn`. The node in force on
   the applied date is jade and enlarged; superseded nodes are crimson-tinted with strikethrough on the number.
6. **ProfileChip / ProfileSheet** — shows `ho_so`: loại hình (hộ kinh doanh / doanh nghiệp nhỏ), ngành (e.g. F&B),
   doanh thu năm (VND), địa bàn. Editable in a sheet. Every answer depends on it, so it is always visible.
7. **VerificationRibbon** — three checks shown in sequence, each with an icon that resolves from spinner →
   ✅/❌: (1) "Điều khoản tồn tại" (article exists), (2) "Còn hiệu lực tại ngày áp dụng" (in force on the applied
   date), (3) "Trích dẫn khớp nguyên văn" (quote matches source verbatim); then (4) "Mô hình kiểm tra nhận định"
   (Spark judged each claim). Shows the attempt counter (`lần 1/3`). If it fails 3 times → amber
   "Cần kế toán xác nhận" state. This is the demo's money shot — give it room.
8. **Checklist** — items `{viec, han, can_cu}`: checkbox, task text, due date as a relative + absolute date
   ("còn 12 ngày · 20/01/2026" [ILLUSTRATIVE]), and the legal basis as a small CitationChip. Overdue = crimson,
   ≤7 days = amber.
9. **ImpactAlert** ("Văn bản mới ảnh hưởng tới bạn") — card on paper with a gold top rule. Shows the new document
   (`van_ban_moi`), the affected articles (`dieu_bi_anh_huong[]`) as old→new diff rows (old struck crimson, new
   jade), and generated tasks (`viec_can_lam[]`) as a Checklist.
10. **DropZone** — for `/ingest`: dashed `--line-strong` border, accepts PDF; on drop shows a scanning animation
    over the file thumbnail, then hands off to ImpactAlert.
11. **StatCard** (stage) — big numeral in display-l `--night-gold`, one-line caption, and a **mandatory source
    tag** (publisher · year, link). A StatCard without a source tag must not render — enforce in the component
    props (`source: { label: string; url: string }` required).
12. **BenchmarkPanel** (stage) — LexVi vs plain RAG on the team test set. **Counts, not percentages**
    ("RAG thường trích điều hết hiệu lực: 7/18 · LexVi: 1/18" [ILLUSTRATIVE]), with N and "bộ câu hỏi do nhóm
    soạn" (team-written test set) always printed.
13. **DisclaimerBar** — persistent, bottom of every app screen, not dismissible:
    "Thông tin tham khảo có trích dẫn, không phải tư vấn. Cần kế toán hoặc cơ quan thuế xác nhận." /
    "Reference information with citations, not advice. Confirm with an accountant or the tax authority."
14. **Buttons** — primary: brand solid, white text, radius-md, 44 px tall; secondary: surface + line-strong
    border; ghost for icon-only (with `aria-label`). Destructive does not exist in this app.
15. **Mic button states** — idle / listening (pulsing ring, reduced-motion → static ring + "Đang nghe…") /
    transcribing (spinner) / error (amber, "Không nhận được giọng nói — hãy gõ câu hỏi"). Voice is optional; the
    app must be fully usable without it.

## 5. Layout principles

- Mobile-first; the persona uses a phone. Breakpoints: 640 / 768 / 1024 / 1280.
- App shell (≥1024): left rail (logo, Hỏi đáp, Cảnh báo, Hồ sơ, Kiểm thử), centre column max 720 px for the
  conversation, CitationDrawer slides over from the right. <1024: top bar + bottom nav; drawer becomes a bottom
  sheet at 90 vh.
- 8 px spacing grid (4 px allowed inside dense chips). Card padding 24 px desktop / 16 px mobile.
- Reading measure for statute text: 60–75 characters.
- One primary action per screen.

## 6. Depth & elevation

- Paper is flat. Elevation is mostly **border + tint**, with at most two shadow levels:
  - `shadow-card`: `0 1px 2px rgb(14 23 38 / 0.06), 0 1px 1px rgb(14 23 38 / 0.04)`
  - `shadow-overlay` (drawer, sheet, popover): `0 12px 32px rgb(14 23 38 / 0.14), 0 2px 6px rgb(14 23 38 / 0.08)`
- Overlay scrim: `rgb(14 23 38 / 0.32)`.
- On stage (dark) use 1 px `--night-line` borders and an inner highlight `inset 0 1px 0 rgb(255 255 255 / 0.04)`
  instead of shadows.

## 7. Do's and don'ts

Do:
- Show the applied date, the profile and the disclaimer on every answer.
- Pair every status colour with an icon and a word.
- Print the source on every statistic and every quoted article.
- Use real data from the team's corpus in the demo; use `[ILLUSTRATIVE]` placeholders in mocks until A has
  checked a figure against the original document.
- Respect `prefers-reduced-motion` everywhere (§10).

Don't:
- Don't use the word **"tư vấn" / "advice"** anywhere in UI copy, alt text, README or video. Meta's usage policy
  prohibits unlicensed legal/tax practice; LexVi gives "thông tin tham khảo có trích dẫn".
- No political content, imagery, slogans or references (organiser guidance excludes "anything political").
  Say only that tax rules changed in 2026.
- No state emblems, flags, or anything imitating the General Department of Taxation / government portals — LexVi
  must never look like an official government site.
- Don't use red/green alone to encode status; don't use gold for text under 24 px.
- Don't put a chatbot avatar/mascot on answers — the authority is the citation, not a character.
- Don't show percentages computed on fewer than ~30 items; show counts with N.
- Don't animate statute text itself (no typewriter effect on law); it appears whole.
- No Streamlit; no dashboard-as-the-main-feature (team rule).

## 8. Responsive behaviour

| Element | < 640 | 640–1023 | ≥ 1024 |
|---|---|---|---|
| Nav | bottom tab bar (4 items) | bottom tab bar | left rail |
| CitationDrawer | bottom sheet 90 vh | bottom sheet | right drawer 480 px |
| AmendmentChain | vertical | horizontal, scrollable | horizontal |
| AskBar | sticky bottom, mic/photo collapse into "+" | full | full |
| StatCards | 1 column, swipe | 2 columns | 3–4 columns |
| Hero motion loop | poster JPEG only | MP4 loop (720p render) | MP4 loop (1080p render) |

Touch targets ≥ 44 px; no hover-only affordances.

## 9. Agent prompt guide

When a coding agent builds UI for LexVi:
1. Read this file first; use only the tokens in §2.4 and fonts in §3. If a needed token is missing, add it here
   (with a contrast ratio) before using it.
2. Build against the API contract in `.claude/context` (CLAUDE.md "API contract"): `POST /ask`, `POST /ingest`.
   Until B's backend is live, use typed mock data with the same shapes, clearly marked `// MOCK`.
3. Components are client components (`'use client'`); the app is client-rendered. Heavy scenes load with
   `next/dynamic(() => import(...), { ssr: false })`.
4. Every new animation: define its reduced-motion fallback in the same component.
5. Every statistic: `StatCard` with a required `source`. Never invent numbers — use the sourced list in
   `planning/research/02-problem-statistics.md`, or `[ILLUSTRATIVE]` placeholders.
6. Copy is Vietnamese-first (§12); keep strings in one dictionary file so an English toggle is possible.
7. Before finishing a screen: check keyboard navigation, focus ring visibility, 320 px width, and
   reduced motion.

Example prompt to give an agent:
> "Build the CitationDrawer from DESIGN.md §4.4 using the `trich_dan` shape from the API contract. Status colours
> from §2.2 with icon + word. AmendmentChain from §4.5, drawn with Motion `pathLength` per §10, reduced-motion
> fallback = instant render. Statute text in the serif token on `surface-sunk`. Mock data marked // MOCK."

---

## 10. Motion

LexVi uses the same motion style as Asterios's other projects (Pyrium `motion/`, the Ignis film
`src/motion/`, Unfound `docs/DESIGN.md` → Motion). The full analysis is in
`planning/research/04-design-dna.md`. In short: **few moves, reused everywhere, overdamped, with focus (blur)
as the third axis**, and **expensive graphics are pre-rendered offline, not computed in the browser**.

### 10.1 Library and tokens

- UI motion: **Motion** (`npm i motion`, `import { motion } from "motion/react"`). Wrap the app in
  `<MotionConfig reducedMotion="user">`. Do not put GSAP and Motion on the same element.
- Easing (house triple, identical across Pyrium and Ignis): `settle` = `cubic-bezier(0.16,1,0.3,1)` for
  entrances; `smooth` = `cubic-bezier(0.45,0,0.2,1)` for camera moves and lines; `exit` =
  `cubic-bezier(0.7,0,0.84,0)` for leaving. `ui` = `cubic-bezier(0.23,1,0.32,1)` for user-triggered feedback.
  Never ease-in for something the user triggered.
- Springs are **overdamped, never bouncy**: Motion `{ type: "spring", damping: 30, stiffness: 140, mass: 0.8 }`
  in the app (Remotion equivalent in films: `{ damping: 200, mass: 0.8, stiffness: 140 }`).
- Durations: `press 120ms` (scale 0.97) · `ui 220ms` · `base 320ms` · `enter 550ms` (presence) ·
  `exit 450ms` · `reveal 800ms` (stage only).

### 10.2 The four reusable moves (build these once, use everywhere)

1. **Presence** (from `time.ts → presence()`): enter = opacity 0→1 **+ blur 10px→0 + y 22px→0** over 550 ms
   `settle`; leave = opacity→0, blur→12px, y→−12px over 450 ms `exit`. The blur is the cinematic part: things
   come into focus like a camera pull rather than just fading.
2. **KineticLine** (word reveal): a headline appears word by word, each word on its own spring, stagger
   ~100 ms (3 frames at 30 fps), rising 0.4 × font-size with blur 8px→0. Stage headlines and video titles only.
3. **Odometer**: numeric stats roll their digits like an odometer, each column on its own spring (column
   stagger ~100 ms), with **motion blur proportional to roll speed** (max 8 px). Used for StatCards and the
   benchmark counts. Tabular numerals.
4. **Draw-on outline / line**: SVG `pathLength` 0→1 (or `strokeDashoffset`) over 700 ms `smooth`, used for the
   AmendmentChain edges, the verification ✅ ticks, strikethroughs on repealed text, and outlines in the video.

### 10.3 Where each moment is used

| Moment | Motion | Reduced-motion fallback |
|---|---|---|
| Answer card enters | Presence | opacity only, 140 ms |
| Citation chips appear | Presence, stagger 60 ms | all at once, fade |
| **VerificationRibbon** (the one choreographed moment of the Ask screen) | checks resolve one by one, 180 ms apart; each ✅ draws on; the attempt counter ticks; on the final pass a faint gold hairline sweeps under the ribbon | final state shown immediately, with text |
| Retry (attempt n/3) | ribbon shakes once ±4 px, 220 ms | counter changes, no shake |
| AmendmentChain | edges draw left→right (Draw-on, `smooth`); the node in force on the applied date scales 1→1.06→1 once | static chain |
| Repealed text | strikethrough draws (320 ms `smooth`), then text fades to 60% | strikethrough shown, no animation |
| **ImpactAlert** (the one choreographed moment of the alert screen) | gold rule sweeps across the top, affected rows enter with Presence, old→new rows cross-fade | static |
| DropZone scanning | brand-tint band sweeps the thumbnail, 1.2 s loop, **stops on result** | spinner + "Đang đọc văn bản…" |
| Drawer | x 100%→0, `settle`, 320 ms; scrim fades | fade |
| StatCards | Odometer on first view (IntersectionObserver, once) | final number |
| Stage headline | KineticLine | static text |
| Hero | pre-rendered loop (§10.4) | poster image |

Rules:
- **One choreographed moment per surface**; everything else stays quiet (Unfound rule, after Linear/Vercel).
- Animate only `transform`, `opacity`, `clip-path`, SVG stroke and `filter: blur()`. **Live blur is expensive**:
  at most ~12 blurred elements animating at once, never blur on scroll-linked animation, and never blur large
  areas (blur only text/chips). Free blur (motion blur, depth of field) belongs in pre-rendered video.
- User-triggered responses start within 220 ms. Nothing loops forever in the app except the listening mic ring
  and the scanning band, and both stop on result.
- Statute text is never animated letter by letter; it appears whole (with Presence at most).

### 10.4 Heavy graphics: bake, don't simulate (Pyrium pattern)

The Pyrium site's 3D (procedural skull, three.js) is **rendered offline with Remotion into short silent MP4
loops with JPEG posters**; the browser only plays a muted video. That is why it looks heavy but loads light:
the GPU cost is paid once at build time, not on every visitor's phone. LexVi does the same:

- **Hero loop "Đồ thị sửa đổi" (amendment graph):** document nodes (mono numbers) settle into a graph; jade
  edges draw in; superseded nodes dim to crimson and sink; one node lights jade as "đang có hiệu lực". Monochrome
  paper/ink with jade/crimson only for status. 8–10 s, **seamless loop** (phase = frame % LOOP; first and last
  camera keys identical), deterministic (seeded PRNG), 1920×1080 at 30 fps, H.264, target ≤ 1.5 MB,
  poster frame at the moment the in-force node is lit.
- Play it with a `MotionLoop` component like Pyrium's `components/ui/MotionLoop.tsx`: `muted loop playsInline
  preload="metadata"`, pause when off-screen (IntersectionObserver, threshold 0.2), poster only under
  `prefers-reduced-motion`, `aria-label` describing the loop.
- Live R3F in the browser is **optional and not needed**. If someone insists, cap it: one canvas,
  `dpr={[1, 1.5]}`, `frameloop="demand"` under reduced motion, dynamic import with `ssr:false`, and pin
  `react@19.3.x` (R3F 9.8 peer range `<19.4`).
- Interactive things (VerificationRibbon, AmendmentChain, ImpactAlert) stay live because they respond to data;
  decorative things get baked.

## 11. Screens (build order)

1. **Ask (Hỏi đáp)** — AskBar + profile chip + applied date; AnswerCard; CitationDrawer with AmendmentChain and
   VerificationRibbon; Checklist; DisclaimerBar. *Must exist for the demo.*
2. **Impact alert (Văn bản mới ảnh hưởng tới bạn)** — DropZone → ImpactAlert with diff rows and tasks. *Must
   exist for the demo (`/ingest`).*
3. **Benchmark (Kiểm thử)** — stage-styled BenchmarkPanel, LexVi vs plain RAG counts with N. *Needed for the
   video's numbers scene.*
4. **Landing (`/`, built 04/11/2026 as a scroll story; see `components/landing/`)** — originally planned as: **Landing / problem (stage)** — hero with the pre-rendered amendment-graph loop (§10.4), 3–4 sourced StatCards
   with Odometer numerals, one-line product claim, "Thử ngay" CTA. *Nice to have; also the video's opening.*
5. **Profile (Hồ sơ)** — edit `ho_so`. Can be the ProfileSheet only.

Cut order if time runs out (from the team plan): photo input → voice input → checklist deadlines → landing 3D
(use static SVG). Never cut: applied-date selection, verified citations with chain, `/ingest` impact screen,
disclaimer, benchmark counts.

## 12. Content & language rules

- UI language: **Vietnamese first** (the users are Vietnamese). Keep all strings in `lib/i18n/vi.ts` (+ `en.ts`
  if time allows) so the video can show an English toggle or be subtitled.
- Tone: plain, short, polite ("bạn"), no legal jargon without a gloss. Sentences ≤ 20 words in answers.
- Every legal figure shown (thresholds, rates, deadlines, fines) must come from the team's verified corpus with
  its citation. Mock screens use `[ILLUSTRATIVE]` until role A has checked the number against the original
  document.
- Never say "tư vấn" / "advice", "đảm bảo" / "guarantee", "chính xác 100%". Say "thông tin tham khảo có trích
  dẫn" and "cần kế toán xác nhận".
- Statistic captions follow: number · one-line meaning · source tag (publisher, year). Proxies are labelled
  "(số liệu gần nhất)" / "(closest available figure)".

## 13. The demo film (role C)

Reuse the **Ignis film pipeline** (`D:\Dev\Projects\Develarper - AMD Act III\video\ignis-film`, Remotion
4.0.531, React 18) instead of building a video stack from scratch. It already has everything the LexVi film
needs:

| Ignis piece | Use in LexVi |
|---|---|
| `capture/capture.mjs`, `capture/record.mjs` + `build_journey.py` (Playwright stills, screen recording with element boxes and stage markers) | Record the real LexVi app (Ask → citation drawer → verification → `/ingest` impact) with outlines on the exact elements |
| `tts/script.json` → `tts/speak.py` (Kokoro TTS, loudness-matched) → `src/timeline.json` + `.srt` | English narration and English subtitles generated from one script; every scene's timing comes from the voice cues (`cue()` in `src/theme.ts`), so picture is locked to narration |
| `src/motion/KineticLine.tsx`, `Odometer.tsx`, `Laptop.tsx` (screen camera + drawn outlines), `Pieces.tsx` (stamps, labels, chips), `Tech.tsx` (badges) | Title lines, the sourced problem figures (Odometer), the app on a laptop with outlines, "Built on Muse Spark" badges |
| Scene structure: People → Problem → Gap → Turn (logo pop) → Product → Proof (results grid) → Close (logo slam) | The LexVi script in the team plan maps onto it 1:1 (problem 0:00–0:25 · product 0:25–1:40 · new document 1:40–2:20 · numbers + architecture 2:20–3:00) |
| `CREDITS.md` (footage, music, SFX licences) and on-screen source citations | Same discipline: every figure on screen carries its source tag; every asset licensed |

Rules for the film:
- Copy the folder to `code/lexvi-film/` (or `video/lexvi-film/`) and change the tokens to LexVi's (§2): light
  canvas `#FAF8F3`, ink `#0E1726`, gold accent at display sizes only, jade/crimson only for status. Swap fonts to
  Be Vietnam Pro / Inter / IBM Plex Mono with the `vietnamese` subset (`@remotion/google-fonts`).
- Footage of people (the café owner) only if licensed for commercial use and credited; otherwise use type-only
  scenes over the paper canvas.
- Remotion's free licence covers individuals and companies of up to 3 people; the LexVi team is 3.
- Target length ≤ 2:50 (check the official rules for the exact limit), 1920×1080, 30 fps, H.264
  (`--crf=16`), subtitles burned in or uploaded as `.srt`.

### 13.1 Camera-ready app (capture contract)

Added 2026-11-03 when the Ask screen was built. The film records the real UI, so the app must render the
same frames on every take.

- **Film mode: `?film=1`** (`lib/film.ts`). Deterministic: fixed "today" (`&today=2026-11-04` by default),
  fixed mock latency (900 ms), no random IDs, no text caret, hidden scrollbars (`html[data-film-mode]` in
  `globals.css`). Other parameters: `&date=` initial applied date, `&q=` prefilled question,
  `&scenario=verified|unverified` force a mock scenario, `&autoplay=1` submit after ~0.8 s (on `/canh-bao`: send the
  sample PDF `public/demo/van-ban-moi-141-2026.pdf` — the same file in mock and API mode), `&pace=2` slow the
  VerificationRibbon (0.5–4×) so the checks read on camera. Example:
  `/hoi-dap?film=1&autoplay=1&q=Quán cà phê của tôi doanh thu khoảng 700 triệu một năm thì có phải nộp thuế không?&pace=2`
- **Language:** the UI opens in **English by default** (decided 3/11 so judges can read it); `?lang=vi|en` forces a
  language, and `?film=1` ignores the viewer's saved choice so takes stay identical. Legal text, quotes, answers
  and tasks stay Vietnamese (the source language); in English a one-line note says so. Strings live in
  `lib/i18n/{en,vi}.ts` (same shape, checked by the `Dict` type).
- **Stable hooks: `data-film="…"`** on everything the film outlines: `ask-bar`, `profile-chip` (`profile-chip-mobile` in the page header below 640 px), `applied-date`,
  `mic-button`, `photo-button`, `send-button`, `suggestion-{i}`, `mock-badge`, `verification-ribbon`,
  `attempt-counter`, `check-{ton_tai|con_hieu_luc|khop_nguyen_van|mo_hinh_danh_gia}`, `answer`,
  `answer-status`, `citation-chip-{i}`, `checklist`, `drawer`, `amendment-chain`, `chain-node-{i}`,
  `profile-sheet`, `disclaimer`, `mock-flag`, `nav-{ask|canh-bao|ho-so|kiem-thu}` (left rail, ≥1024) and
  `nav-mobile-{…}` (bottom nav, <1024). The ribbon repeated inside the drawer uses the `drawer-` prefix
  (`drawer-verification-ribbon`, `drawer-attempt-counter`, `drawer-check-*`) so every hook is unique on screen.
  Voice/photo: `voice-status`, `photo-summary`, `photo-use-question` (with the existing `mic-button`,
  `photo-button`; film mode uses canned example results so takes stay identical, each labelled on screen:
  `voice-canned` "Example recording — not a live transcription", `photo-canned` "Example photo reading — not
  live").
  Ask (real backend): `run-meta`, `drawer-claim`, `relation-list` (groups `relation-amended-by`,
  `relation-amends`, `relation-referred-by`), `drawer-source-pdf` ("Source PDF, p. N", the official PDF at the
  cited page) and `drawer-source` (the document's landing page). Benchmark (`/kiem-thu`): `benchmark-panel`,
  `benchmark-metric-{dan_dieu_cu|dung_can_cu|trich_sai|can_xac_nhan}`, `benchmark-table`, `benchmark-empty`.
  Profile (`/ho-so`): `profile-form`, `profile-saved`.
  Impact screen (`/canh-bao`): `drop-zone`, `choose-button`, `sample-button`, `scan`, `impact-alert`, `impact-rule`,
  `impact-row-{i}`, `impact-affects-{i}`, `impact-tasks`, `impact-dropped`, `impact-replay` ("Historical replay:
  Decree … added to the corpus"), `impact-issued`, `impact-retroactive`; Benchmark also `benchmark-disclosure`,
  `benchmark-extra`; shell: `lang-toggle` (left rail) and `lang-toggle-mobile` (top bar <1024), `skip-link`.
  Never rename one without updating the capture scripts.
- **Capture viewport:** 1440×900 CSS px at deviceScaleFactor 2 (≥1024 layout: left rail + right drawer). Phone
  shots: 390×844.
- **No dev overlays:** `devIndicators: false` in `next.config.ts`; record from `pnpm build && pnpm start` when
  possible.
- **Honesty:** while the app runs on mocks the "Prepared example responses · not live output" badge (vi "Phản hồi mẫu
  chuẩn bị sẵn · không phải kết quả trực tiếp") with its note, the `mock-flag` ("Prepared example") in the
  always-visible disclaimer bar and the drawer's "Prepared example — article text is verbatim from the official PDF"
  note stay visible. The mocks are built from the real corpus (verbatim article texts), but the answers are prepared,
  not produced live; the Alerts screen labels its run a historical replay. Don't hide them in film mode. Record final footage only on A's verified
  data or B's live backend (constraints.md kill criteria).
- **Mobile AskBar:** below 640 px the AskBar (without the profile chip, which moves to the page header) moves to the end of the column and sticks above the disclaimer and
  bottom nav (§8); the applied-date picker stays near the top.
- **Deviation from §4.5/§8:** the AmendmentChain is **vertical inside the 480 px drawer** at every width (five
  nodes don't fit across 480 px without scrolling, which reads badly on camera). The component also supports
  `orientation="horizontal"` for wider surfaces.
