"""LexVi vs plain RAG on the test questions in data/questions.json.

Each question: {cau_hoi, ngay_ap_dung, ho_so, dieu_dung: [ids that answer it]}.
Metrics per system:
  dung_can_cu   answer cites at least one provision in dieu_dung
  dan_dieu_cu   answer cites a provision that does not apply on the asked date (the error LexVi targets)
  trich_sai     a quote is not verbatim in the cited provision
  can_xac_nhan  answer was flagged for an accountant (LexVi only)
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
from lexvi.config import DATA_DIR, ROOT, make_client
from lexvi.store import LawStore
from lexvi.verify import normalize

SYSTEMS = {"rag_thuong": baseline.ask, "lexvi": agent.ask}


def score(store: LawStore, q: dict, out: dict) -> dict:
    cited = [str(c.get("id", "")) for c in out.get("trich_dan") or []]
    on = q["ngay_ap_dung"]
    stale = [pid for pid in cited if not store.status(pid, on).in_force]
    bad_quote = [c.get("id") for c in out.get("trich_dan") or []
                 if (p := store.provision(str(c.get("id", "")))) is None
                 or normalize(c.get("cau_trich", "")) not in normalize(p["noi_dung"])]
    return {"dung_can_cu": bool(set(cited) & set(q["dieu_dung"])), "dan_dieu_cu": bool(stale),
            "trich_sai": bool(bad_quote), "can_xac_nhan": bool(out.get("can_xac_nhan")),
            "trich_dan": cited, "dieu_cu": stale}


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
                out, row = {"error": str(error)}, {"dung_can_cu": False, "dan_dieu_cu": False,
                                                   "trich_sai": False, "can_xac_nhan": False, "loi": str(error)}
            rows.append({"cau": i, "he": name, "giay": round(time.time() - started, 1), **row,
                         "tra_loi": out.get("tra_loi", "")})
            print(f"[{i}/{len(questions)}] {name}: {row}")
    summary = {}
    for name in SYSTEMS:
        mine = [r for r in rows if r["he"] == name]
        summary[name] = {k: f"{sum(r[k] for r in mine)}/{len(mine)}"
                         for k in ("dung_can_cu", "dan_dieu_cu", "trich_sai", "can_xac_nhan")}
    out_dir = ROOT / "eval"
    out_dir.mkdir(exist_ok=True)
    path = out_dir / f"results-{time.strftime('%Y%m%d-%H%M')}.json"
    path.write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n| Hệ | Đúng căn cứ | Dẫn điều đã hết hiệu lực | Trích sai nguyên văn | Gắn nhãn cần xác nhận |")
    print("|---|---|---|---|---|")
    for name, s in summary.items():
        print(f"| {name} | {s['dung_can_cu']} | {s['dan_dieu_cu']} | {s['trich_sai']} | {s['can_xac_nhan']} |")
    print(f"\nĐã lưu {Path(path).relative_to(ROOT)}")


if __name__ == "__main__":
    main()
