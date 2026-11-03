"""Read one provision by ID/date without an API key."""
import argparse
import json
from dataclasses import asdict
from pathlib import Path

from lexvi.store import LawStore


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    parser.add_argument("--id", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--known-on")
    args = parser.parse_args()
    store = LawStore(args.data)
    result = {"dieu_khoan": store.provision(args.id), "tinh_trang": asdict(store.status(args.id, args.date, args.known_on)),
              "quan_he": store.trace(args.id), "trang_nguon": store.source_pages(args.id)}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
