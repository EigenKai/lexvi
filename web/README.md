# LexVi — web app

LexVi is a tax-compliance lookup assistant for Vietnamese household businesses (hộ kinh doanh) and
small enterprises. It answers **only from regulations in force on the date asked**, cites the exact
article and clause, shows the amendment chain, and checks every citation before answering.
It gives **reference information with citations** ("thông tin tham khảo có trích dẫn"), and every
answer ends with an accountant-confirmation step.

Built for the Meta Global AI Developer Hackathon (Nov 2026). This repository is the web UI (role C).
The backend (agent loop on Muse Spark, verification, `/ingest`) and the legal corpus are built by
the other team members.

> **Status (03/11/2026): the UI runs on typed mock data.** Until the backend URL is configured,
> every answer, citation, date and figure on screen is illustrative and has not been checked
> against the original legal texts. The app shows a "Dữ liệu minh hoạ" flag while in this mode.

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
| `NEXT_PUBLIC_LEXVI_API_TIMEOUT_MS` | `60000` | Timeout for backend calls. |
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
