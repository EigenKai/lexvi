"""LexVi vs plain RAG on the test questions in data/questions.json.

Each question: {cau_hoi, ngay_ap_dung, ho_so, dieu_dung: [ids that answer it]}.
Metrics per system:
  dung_can_cu    answer cites at least one provision in dieu_dung
  dan_dieu_cu    answer cites an existing provision that does not apply on the asked date (the
                 error LexVi targets); a partly amended clause counts as applying only when the
                 answer also cites its amending clause (the same rule as verify.citable)
  id_bia         answer cites an id that does not exist in the store (made up)
  trich_sai      a quote is missing, too short, or not verbatim in the cited provision
  can_xac_nhan   answer was flagged for an accountant (LexVi only)
  khong_tra_loi  answer came back without any citation (fallback, no basis found)
  loi            the system crashed on this question
LexVi's dan_dieu_cu is 0 by construction: its submit step refuses citations with the same
status() rule. Say so wherever the number is shown.
Writes eval/results-<timestamp>.json and prints a table for the README.

    python -m scripts.run_eval            # both systems
    python -m scripts.run_eval --limit 5
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from lexvi import agent, baseline
from lexvi.config import DATA_DIR, ROOT, make_client, model
from lexvi.store import LawStore
from lexvi.verify import MIN_QUOTE_CHARS, citable, is_verbatim, normalize

SYSTEMS = {"rag_thuong": baseline.ask, "lexvi": agent.ask}
COUNTS = ("dung_can_cu", "dan_dieu_cu", "id_bia", "trich_sai", "can_xac_nhan", "khong_tra_loi", "loi")


def score(store: LawStore, q: dict, out: dict) -> dict:
    citations = out.get("trich_dan") or []
    cited = [str(c.get("id", "")) for c in citations]
    on = q["ngay_ap_dung"]
    made_up = [pid for pid in cited if store.provision(pid) is None]
    stale = [pid for pid in cited if pid not in made_up and not citable(store, pid, on, set(cited))]
    bad_quote = [c.get("id") for c in citations
                 if (p := store.provision(str(c.get("id", "")))) is None
                 or len(normalize(c.get("cau_trich", ""))) < MIN_QUOTE_CHARS
                 or not is_verbatim(c.get("cau_trich", ""), p["noi_dung"])]
    return {"dung_can_cu": bool(set(cited) & set(q["dieu_dung"])), "dan_dieu_cu": bool(stale),
            "id_bia": bool(made_up), "trich_sai": bool(bad_quote), "can_xac_nhan": bool(out.get("can_xac_nhan")),
            "khong_tra_loi": not citations, "loi": False, "trang_thai": out.get("trang_thai", "answered"),
            "trich_dan": cited, "dieu_cu": stale, "id_khong_co": made_up}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    questions = json.loads((DATA_DIR / "questions.json").read_text(encoding="utf-8"))
    questions = questions[: args.limit] if args.limit else questions
    store, client = LawStore(DATA_DIR), make_client()
    rows = []
    for i, q in enumerate(questions, 1):
        for name, fn in SYSTEMS.items():
            started = time.time()
            try:
                out = fn(client, store, q["cau_hoi"], q["ngay_ap_dung"], q.get("ho_so") or {})
                row = score(store, q, out)
            except Exception as error:  # count a crash as a wrong answer, keep going
                out = {"error": str(error)}
                row = {**{k: False for k in COUNTS}, "loi": True, "trang_thai": "loi",
                       "chi_tiet_loi": f"{type(error).__name__}: {error}"}
            rows.append({"cau": i, "id": q.get("id"), "he": name, "giay": round(time.time() - started, 1), **row,
                         "tra_loi": out.get("tra_loi", "")})
            print(f"[{i}/{len(questions)}] {name}: {row}")
    summary = {}
    for name in SYSTEMS:
        mine = [r for r in rows if r["he"] == name]
        summary[name] = {k: f"{sum(bool(r[k]) for r in mine)}/{len(mine)}" for k in COUNTS}
    out_dir = ROOT / "eval"
    out_dir.mkdir(exist_ok=True)
    path = out_dir / f"results-{time.strftime('%Y%m%d-%H%M')}.json"
    path.write_text(json.dumps({"model": model(), "summary": summary, "rows": rows}, ensure_ascii=False, indent=1),
                    encoding="utf-8")
    print("\n| Hệ | Đúng căn cứ | Dẫn điều đã hết hiệu lực | ID bịa | Trích sai nguyên văn | Gắn nhãn cần xác nhận "
          "| Không trích dẫn | Lỗi |")
    print("|---|---|---|---|---|---|---|---|")
    for name, s in summary.items():
        print(f"| {name} | {s['dung_can_cu']} | {s['dan_dieu_cu']} | {s['id_bia']} | {s['trich_sai']} "
              f"| {s['can_xac_nhan']} | {s['khong_tra_loi']} | {s['loi']} |")
    print(f"\nĐã lưu {Path(path).relative_to(ROOT)}")


if __name__ == "__main__":
    main()
