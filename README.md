# LexVi

LexVi answers Vietnamese tax questions for household businesses and small firms. It cites the provision that
applies **on the date asked**, follows the amendment chain, and warns when a new regulation affects the business.
LexVi gives information with citations, not tax advice: every answer is for the owner and their accountant to
confirm.

Built for the Meta Global AI Developer Hackathon (27 Oct – 4 Nov 2026). All code in this repository was written
during the hackathon; the first commit is dated 3 Nov 2026.

## Why

Vietnam's tax rules for household businesses changed in 2026, and web pages quote different revenue thresholds
from different documents. Plain retrieval finds the old clause as easily as the new one. LexVi treats legal
validity as data: every provision carries its effective dates and the relations that amend, replace or repeal it.

## How it uses Meta models

All model calls go to `muse-spark-1.3` through the Meta Model API (OpenAI SDK, Responses API).

| Step | What Spark does | What code checks |
|---|---|---|
| Agent loop (`lexvi/agent.py`) | picks one tool per turn: read the business profile, search provisions, read full text, trace amendments, submit | tool results already state whether each provision applies on the asked date |
| Verification (`lexvi/verify.py`) | judges whether each cited provision supports the claim attached to it | before the judge: provision exists, applies on the date, quote is verbatim, checklist items cite cited provisions |
| Refusal and escalation | reads the refusal reasons and fixes the answer | after 3 refusals the answer goes out flagged `can_xac_nhan` (needs an accountant) |
| New regulation (`lexvi/ingest.py`) | reads a new PDF, maps each change to a stored provision, decides if it affects this business, writes dated to-dos | every excerpt must be verbatim in the PDF and every target must exist, else the change is dropped |
| Corpus data (role A, `scripts/rebuild_a.py`) | no model call for the checked-in corpus | offline parsing preserves source page spans; amendment edges and legal-date exceptions carry evidence |

## API

```
POST /ask     {"cau_hoi": "...", "ngay_ap_dung": "2026-11-01",
               "ho_so": {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 400000000, "dia_ban": "TP.HCM"}}
  -> {tra_loi, trich_dan[{id, cau_trich, nhan_dinh, trang, vi_tri_nguon, so_hieu, ten_van_ban, nguon_url,
                          tinh_trang, ap_dung_ngay_hoi, ngay_ban_hanh, hieu_luc_tu, het_hieu_luc, hoi_to,
                          sua_doi_toi[], bi_sua_doi_boi[], dan_chieu[], chuoi_sua_doi[]}],
      checklist[{viec, han, can_cu}], can_xac_nhan, run_id, trang_thai, so_luot, thoi_gian_giay}
      trang_thai: answered | needs_review | no_basis | turn_limit | api_error | cancelled
POST /ingest  multipart: pdf=<file>, ho_so=<JSON string>
  -> {van_ban_moi, dieu_bi_anh_huong[], viec_can_lam[], bi_loai[], can_xac_nhan}
GET  /runs/{run_id}   every tool call of one /ask run, for the "how LexVi checked this" view
GET  /health
```

Observed on 4 Nov 2026, before the QA fixes (turn limit 14): `/ask` took 7–14 Spark turns and 40–106 s;
`/ingest` about 48 s. The turn limit is now 20; `/ask` stops between turns when the client disconnects.

## Run

```bash
python3 -m venv pyenv && pyenv/bin/pip install -r requirements-data.txt  # includes requirements.txt; tests need both
cp .env.example .env          # add MODEL_API_KEY
pyenv/bin/python -m pytest -q # offline tests, no API calls
pyenv/bin/uvicorn lexvi.api:app --port 8000
```

Data: see [`data/README.md`](data/README.md). Role-A handoff: [`docs/ROLE_A_HANDOFF.md`](docs/ROLE_A_HANDOFF.md).
Evaluation against plain RAG: `pyenv/bin/python -m scripts.run_eval`.

## Deploy on Render (the live demo)

The live demo runs this backend as a Render web service at `https://lexvi-api.onrender.com` (`GET /health`).
It was created from the public repository URL, branch `fix/qa-backend` (merged into `main` on 4 Nov 2026), so
deploys are manual.

| Setting | Value |
|---|---|
| Runtime | Python 3 (`.python-version` pins 3.12) |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn lexvi.api:app --host 0.0.0.0 --port $PORT`, one worker, because the limits live in memory |
| Health check | `/health` |

**Environment:** `MODEL_API_KEY` (secret), `MODEL_API_MODEL=muse-spark-1.3`, and `LEXVI_CORS_ORIGINS` (the live site).
The public-deploy guards in `lexvi/limits.py` are all off unless set:

- `LEXVI_REQUIRE_ORIGIN=1`: `POST /ask` and `/ingest` need an `Origin` listed in `LEXVI_CORS_ORIGINS`. CORS on its own
  binds only browsers.
- `LEXVI_BUDGET_USD_DAY=10`: the estimated spend of all visitors over a rolling 24 h.
  - It is computed from the metered token use (`su_dung` in each response) at Meta's list prices.
  - `0` turns live answers off.
- `LEXVI_LIMIT_ASK=4/h,10/d` and `LEXVI_LIMIT_INGEST=2/h,3/d`: per visitor.
- `LEXVI_MAX_BUSY=3`: requests running at once.

**Refusals and resets:**
- A refusal is HTTP 429 with `Retry-After`.
- A request that never reached the model, such as an unreadable PDF, is not counted.
- The counters reset when the process restarts.

**Keep-warm:** a Free instance sleeps after 15 idle minutes and takes about a minute to wake.
`.github/workflows/keep-warm.yml` on `main` pings `/health` every 10 minutes until the date set in that file.

## Results

Role A's offline data audit passes: **30 documents, 689 articles, 3,586 provision records,
261 graph edges, 20 reference questions (11 temporal traps)**. All 27 reference citations are
located on source pages; 13 stale-citation examples are rejected. `python -m pytest -q`: **107 passed**
(offline; install `requirements-data.txt` too for the corpus tests).
66 of the 261 edges (Decree 70/2025 → Decree 123/2020) and the phrase-replacement scope of the 10
Decree 141 edges were added by role C's QA on 4 Nov 2026 and await role A's review (`ghi_chu`).

### LexVi vs plain RAG

`scripts/run_eval.py`, run once on 04/11/2026, 11:19–11:33 ICT, on the team-written test set
(`data/questions.json`, 20 questions, 11 of them date traps). Both systems use `muse-spark-1.3` and the full corpus.
Plain RAG is BM25 top 6 plus one Spark call. Counts, not rates:

| | Plain RAG | LexVi |
|---|---|---|
| Cited a provision not in force on the applied date | 3/20 | 0/20 |
| Cited the expected legal basis (at least one article in `dieu_dung`) | 14/20 | 20/20 |
| Quote not verbatim | 0/20 | 0/20 |
| No citation | 1/20 | 0/20 |
| Median time per question | 8.4 s | 30.6 s |

How to read it:
- LexVi's 0 outdated citations holds by construction: its submit step refuses provisions not in force on the date,
  and the scorer uses the same `store.status()`. The comparison that matters is the expected basis, 20 against 14.
- "Expected basis" checks that the right article was cited, not that the whole answer is legally correct.
- N = 20 on a set the team wrote, one run of a non-deterministic agent. This is not a general accuracy claim.

The demo video shows the web UI with prepared example responses built from the real corpus; the numbers scene uses
the counts above. The reference answers and graph are agent-reviewed and still require human legal sign-off.

## Data sources

The bounded corpus was collected and checked on **3 Nov 2026**, from the Government document portal
and Công báo. All 30 document numbers, issuance/effective dates, official links, text editions and
SHA-256 provenance are listed in [`data/SOURCES.md`](data/SOURCES.md) and `data/sources.json`.
Original signed PDFs, Công báo parts and page text are checked in. No third-party legal database,
ViHERMES code or URAx-Law graph was imported.

The role-A data pipeline, graph curation, reference QA set, replay demo and temporal/page handling
were added on 3 Nov 2026 as part of this hackathon. This does not claim work was done on 31 Oct.

## Limits

- Covers only the documents in `data/`; questions outside them come back as "no basis found".
- The graph is curated for the F&B demo scope, not an exhaustive consolidation of every amendment.
  A clause that is only partly amended (a phrase or a point) can be cited only together with the clause
  that amends it; a clause rewritten in full cannot be cited; an unchanged sibling remains available.
- `demo/role_a/` replays the historical arrival of Decree 141/2026 and is labelled as a replay.
- Not tax or legal advice. Answers flagged `can_xac_nhan` must be checked by an accountant or the tax office.
