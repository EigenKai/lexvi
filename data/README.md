# Data format (role A fills this folder)

The backend reads four JSON files from this folder at start-up. Dates are `YYYY-MM-DD`.

## 1. `sources.json` + `pdf/`: one entry per legal document

Download PDFs only from official sources (vbpl.vn, Công báo, gdt.gov.vn). Do not scrape thuvienphapluat.

```json
[{"so_hieu": "68/2026/QH15", "loai": "luat", "tieu_de": "...", "ngay_ban_hanh": "2026-06-10",
  "hieu_luc_tu": "2026-07-01", "het_hieu_luc": null, "nguon_url": "https://vbpl.vn/...", "file": "68-2026-QH15.pdf"}]
```

Then run `python -m scripts.build_corpus`. It writes `van_ban.json` and `dieu_khoan.json`: Spark splits each PDF
into clauses, and the script keeps only clauses whose text is verbatim in the PDF (it prints how many it dropped).
Scanned PDFs without a text layer are not supported; find the text version.

Clause ids look like `68-2026-QH15-D4-K1` (document, Điều 4, khoản 1). Check a few against the PDF by hand.

## 2. `quan_he.json`: the amendment graph (written by hand)

```json
[{"tu_id": "NEW-CLAUSE-OR-DOC", "den_id": "OLD-CLAUSE-OR-DOC", "loai": "sua_doi", "hieu_luc_tu": "2026-07-01"}]
```

- `tu_id` is the newer clause (or a whole document by `so_hieu`), `den_id` the one it acts on.
- `loai`: `sua_doi`, `thay_the`, `bai_bo` (these three stop the old text applying from `hieu_luc_tu`),
  `huong_dan`, `dan_chieu` (informational).
- Use a whole-document `den_id` only when the entire document is replaced.

## 3. `questions.json`: test set for `python -m scripts.run_eval`

```json
[{"cau_hoi": "...", "ngay_ap_dung": "2026-11-01",
  "ho_so": {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 400000000, "dia_ban": "TP.HCM"},
  "dieu_dung": ["68-2026-QH15-D4-K1"]}]
```

At least 5 questions should be traps: a search engine finds the old clause first, but it was amended before
`ngay_ap_dung`. Those are the questions where plain RAG fails and LexVi should not.

`tests/fixtures/` holds a three-clause synthetic set used only by the offline tests; it is not real law.
