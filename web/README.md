# LexVi — web app

LexVi is a tax-compliance lookup assistant for Vietnamese household businesses (hộ kinh doanh) and
small enterprises. It answers **only from regulations in force on the date asked**, cites the exact
article and clause, shows the amendment chain, and checks every citation before answering.
It gives **reference information with citations** ("thông tin tham khảo có trích dẫn"), and every
answer ends with an accountant-confirmation step.

Built for the Meta Global AI Developer Hackathon (Nov 2026). This repository is the web UI (role C).
The backend (agent loop on Muse Spark, verification, `/ingest`) and the legal corpus are built by
the other team members.

> **Demo note (04/11/2026): the demo film shows prepared example responses, not live output.**
> With `NEXT_PUBLIC_LEXVI_API_URL` empty, the UI answers from `lib/api/mock.ts`. Article texts,
> pages, PDF links and document dates in those answers are extracted verbatim from role A's corpus
> (`../data`) by `pnpm mock:corpus` into `lib/api/mock-corpus.json`. The answers, checklists and
> verification attempts were written for the demo. The app labels them "Prepared example responses"
> ("Phản hồi mẫu") in this mode. With the URL set, the same UI calls the live backend in this repo.

## Screens

- **Ask** (`/`): question, business profile and applied date → answer with verified citations, the amendment
  chain and a checklist.
- **New regulation affecting you** (`/canh-bao`): drop a new legal PDF → `POST /ingest` → the articles it
  changes (old text → new text), whether each affects this business, tasks, and changes dropped by verification.
- **Benchmark** (`/kiem-thu`): plain RAG vs LexVi on the team-written test set, as counts with N. It shows
  "no results yet" until a real run is imported (see below); it never shows placeholder numbers.
- **Profile** (`/ho-so`): the business profile every answer depends on (stored in this browser only).

### Voice and photo input

- **Voice:** the mic records in the browser, converts to 24 kHz mono WAV and sends it to `/api/transcribe`,
  which forwards it to Muse Voice Transcribe (`POST /v1/asr/transcribe`, Vietnamese-biased). The transcript
  fills the question box; the owner checks it before sending. Recording stops after 60 s.
- **Photo:** a photo of a tax notice or invoice is downscaled and sent to `/api/read-image`, where Muse Spark
  reads it and returns a short summary and a drafted Vietnamese question (never an answer). The owner sends
  that question through the normal verified `/ask`; a date found on the paper can set the applied date.
- Both routes run inside this Next.js app and need `MODEL_API_KEY` in `.env.local` (server-only). They accept
  requests from this app's own pages only, log request ids and status codes only, and store nothing.
  Recordings and photos are sent to the Meta Model API. Transcription costs $0.18 per audio hour (Meta's
  published price).

### Backend connection

With `NEXT_PUBLIC_LEXVI_API_URL` set, the Ask screen calls `POST /ask`, then `GET /runs/{run_id}` to replay the
verification attempts and show the article text the agent read (`lib/api/adapter.ts`). The backend reports
statuses and refusal reasons as Vietnamese sentences; the adapter maps them to the UI's statuses and checks.

### Benchmark results

After `python -m scripts.run_eval` (repo root) writes `eval/results-<timestamp>.json`:

```sh
cd web && pnpm benchmark:import   # copies the newest run into lib/benchmark/results.json
```

The UI opens in **English**; the EN | VI toggle switches to Vietnamese (`?lang=vi` in the URL also works).
Legal text, quotes and answers stay in Vietnamese, the language of the source law.

## Built during the hackathon

All code in this repository was written during the hackathon, starting 03/11/2026 (the event began
26/10/2026). Third-party code is limited to the dependencies listed in `package.json`.

## Run it

Requires Node ≥ 24 and pnpm 11.

```sh
pnpm install
cp .env.example .env.local   # optional; see "Configuration"
pnpm dev                     # http://localhost:3000
```

Checks (run before every commit; CI should run the same):

```sh
pnpm check   # biome ci + next typegen + tsc --noEmit + next build
```

## Configuration

All variables are optional and documented in [`.env.example`](.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_LEXVI_API_URL` | empty → mock data | Backend base URL (`POST /ask`, proposed `GET /dieu-khoan/{id}`). Public; inlined at build time. The backend must allow this origin via CORS. |
| `NEXT_PUBLIC_LEXVI_API_TIMEOUT_MS` | `180000` | Timeout for backend calls (a real `/ask` takes 30–90 s). |
| `NEXT_TELEMETRY_DISABLED` | unset | Set to `1` to disable Next.js telemetry. |

Never put a key or token in a `NEXT_PUBLIC_*` variable; never commit `.env.local`.

## Demo / film mode

`?film=1` makes the UI deterministic for screen recording (fixed date, fixed timings, no caret or
scrollbars). Parameters and the `data-film` element hooks are documented in
[`DESIGN.md` §13.1](DESIGN.md).

## Stack

Next.js 16 (App Router, client-rendered screens), React 19.3, TypeScript, Tailwind CSS 4,
Motion 14, Radix UI, lucide-react; Biome for lint/format; pnpm. Design system: [`DESIGN.md`](DESIGN.md).

## Data sources

To be completed by the data owner: every document in the corpus with its official source
(vbpl.vn, Công báo, the tax department site).
