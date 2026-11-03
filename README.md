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
  -> {tra_loi, trich_dan[{id, cau_trich, nhan_dinh, trang, so_hieu, ten_van_ban, nguon_url, tinh_trang, chuoi_sua_doi}],
      checklist[{viec, han, can_cu}], can_xac_nhan, run_id, trang_thai, so_luot, thoi_gian_giay}
POST /ingest  multipart: pdf=<file>, ho_so=<JSON string>
  -> {van_ban_moi, dieu_bi_anh_huong[], viec_can_lam[], bi_loai[], can_xac_nhan}
GET  /runs/{run_id}   every tool call of one /ask run, for the "how LexVi checked this" view
GET  /health
```

A typical `/ask` takes 4–8 Spark turns and about 30 s; `/ingest` about 45 s.

## Run

```bash
python3 -m venv pyenv && pyenv/bin/pip install -r requirements.txt
cp .env.example .env          # add MODEL_API_KEY
pyenv/bin/python -m pytest -q # offline tests, no API calls
pyenv/bin/uvicorn lexvi.api:app --port 8000
```

Data: see [`data/README.md`](data/README.md). Role-A handoff: [`docs/ROLE_A_HANDOFF.md`](docs/ROLE_A_HANDOFF.md).
Evaluation against plain RAG: `pyenv/bin/python -m scripts.run_eval`.

## Results

Role A's offline data audit passes: **30 documents, 689 articles, 3,586 provision records,
195 graph edges, 20 reference questions (11 temporal traps)**. All 27 reference citations are
located on source pages; 13 stale-citation examples are rejected. `python -m pytest -q`: **28 passed**.

These are corpus/verification checks, not Spark answer accuracy. Spark vs plain-RAG figures have
not been measured here; role B can run `scripts/run_eval.py` with its own API key. The reference
answers and graph are agent-reviewed and still require human legal sign-off.

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
  A partly amended clause is rejected as-written; an unchanged sibling remains available.
- `demo/role_a/` replays the historical arrival of Decree 141/2026 and is labelled as a replay.
- Not tax or legal advice. Answers flagged `can_xac_nhan` must be checked by an accountant or the tax office.
