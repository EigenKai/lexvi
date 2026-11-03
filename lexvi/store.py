"""The law store: documents, provisions and the amendment graph, with validity by date.

Data comes from data/*.json in the team contract format (see data/README.md):
  van_ban.json     [{so_hieu, loai, tieu_de, ngay_ban_hanh, hieu_luc_tu, het_hieu_luc, nguon_url}]
  dieu_khoan.json  [{id, so_hieu, dieu, khoan, noi_dung, trang}]
  quan_he.json     [{tu_id, den_id, loai, hieu_luc_tu}]   tu_id = the newer provision/document
A relation endpoint is either a provision id or a document so_hieu (whole document).
Dates are ISO strings (YYYY-MM-DD), so string comparison orders them.
"""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import date
from pathlib import Path

# Relations that stop the target text from applying as written from their start date.
OVERRIDING = {"sua_doi", "thay_the", "bai_bo"}
_WORD = re.compile(r"\w+", re.UNICODE)


@dataclass(frozen=True)
class Status:
    in_force: bool
    reason: str
    replaced_by: tuple = ()


class LawStore:
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self._pages_cache = {}
        self._provision_meta = {}
        self._relations = []
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self._create()
        self._load(Path(data_dir))

    def _create(self) -> None:
        self.db.executescript(
            """
            CREATE TABLE van_ban(so_hieu TEXT PRIMARY KEY, loai TEXT, tieu_de TEXT, ngay_ban_hanh TEXT,
                                 hieu_luc_tu TEXT, het_hieu_luc TEXT, nguon_url TEXT);
            CREATE TABLE dieu_khoan(id TEXT PRIMARY KEY, so_hieu TEXT, dieu TEXT, khoan TEXT,
                                    noi_dung TEXT, trang INTEGER);
            CREATE TABLE quan_he(tu_id TEXT, den_id TEXT, loai TEXT, hieu_luc_tu TEXT);
            CREATE VIRTUAL TABLE dk_fts USING fts5(id UNINDEXED, noi_dung,
                                                   tokenize='unicode61 remove_diacritics 2');
            """
        )

    def _load(self, data_dir: Path) -> None:
        def rows(name: str) -> list:
            path = data_dir / f"{name}.json"
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []

        for v in rows("van_ban"):
            self.db.execute(
                "INSERT OR REPLACE INTO van_ban VALUES(?,?,?,?,?,?,?)",
                (v["so_hieu"], v.get("loai"), v.get("tieu_de"), v.get("ngay_ban_hanh"),
                 v.get("hieu_luc_tu"), v.get("het_hieu_luc"), v.get("nguon_url")),
            )
        for d in rows("dieu_khoan"):
            self.add_provision(d)
        for q in rows("quan_he"):
            self.add_relation(q)
        self.db.commit()

    def add_provision(self, d: dict) -> None:
        self._provision_meta[d["id"]] = dict(d)
        self.db.execute(
            "INSERT OR REPLACE INTO dieu_khoan VALUES(?,?,?,?,?,?)",
            (d["id"], d["so_hieu"], str(d.get("dieu", "")), str(d.get("khoan") or ""),
             d["noi_dung"], int(d.get("trang") or 0)),
        )
        self.db.execute("DELETE FROM dk_fts WHERE id=?", (d["id"],))
        self.db.execute("INSERT INTO dk_fts VALUES(?,?)", (d["id"], d["noi_dung"]))

    def add_relation(self, q: dict) -> None:
        self._relations.append(dict(q))
        self.db.execute("INSERT INTO quan_he VALUES(?,?,?,?)",
                        (q["tu_id"], q["den_id"], q["loai"], q.get("hieu_luc_tu")))

    # ---- lookups ---------------------------------------------------------------

    def provision(self, pid: str) -> dict | None:
        row = self.db.execute(
            "SELECT d.*, v.tieu_de AS ten_van_ban, v.loai, v.hieu_luc_tu, v.het_hieu_luc, v.nguon_url "
            "FROM dieu_khoan d LEFT JOIN van_ban v USING(so_hieu) WHERE d.id=?", (pid,)
        ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result.update(self._provision_meta.get(pid, {}))
        return result

    def document(self, so_hieu: str) -> dict | None:
        row = self.db.execute("SELECT * FROM van_ban WHERE so_hieu=?", (so_hieu,)).fetchone()
        return dict(row) if row else None

    def provisions_of(self, so_hieu: str) -> list[dict]:
        rows = self.db.execute("SELECT id FROM dieu_khoan WHERE so_hieu=? ORDER BY rowid", (so_hieu,))
        return [self.provision(r["id"]) for r in rows]

    def search(self, query: str, limit: int = 8) -> list[str]:
        """Provision ids ranked by BM25 over the text (any of the query words)."""
        words = [w for w in _WORD.findall(query.lower()) if len(w) > 1]
        if not words:
            return []
        match = " OR ".join(f'"{w}"' for w in words)
        rows = self.db.execute(
            "SELECT id FROM dk_fts WHERE dk_fts MATCH ? ORDER BY bm25(dk_fts) LIMIT ?", (match, limit)
        )
        return [r["id"] for r in rows]

    def relations_to(self, pid: str) -> list[dict]:
        """Relations whose target is this provision or its whole document."""
        p = self.provision(pid)
        return [dict(r) for r in self._relations
                if r["den_id"] == pid or (p and (r["den_id"] == p["so_hieu"]
                   or pid.startswith(r["den_id"] + "-")))]

    def relations_from(self, pid: str) -> list[dict]:
        p = self.provision(pid)
        sources = (pid, p["so_hieu"]) if p else (pid,)
        return [dict(r) for r in self._relations if r["tu_id"] in sources]

    def status(self, pid: str, on: str, known_on: str | None = None) -> Status:
        """Does this provision apply, as written, on date `on`?"""
        date.fromisoformat(on)
        if known_on:
            date.fromisoformat(known_on)
        p = self.provision(pid)
        if p is None:
            return Status(False, f"không có điều khoản {pid} trong kho")
        doc = self.document(p["so_hieu"]) or {}
        if known_on and doc.get("ngay_ban_hanh", "") > known_on:
            return Status(False, f"chưa ban hành tại thời điểm biết {known_on}")
        if p.get("can_duyet_ocr"):
            return Status(False, "bản OCR chưa được đối chiếu, cần xác nhận")
        if p["hieu_luc_tu"] and on < p["hieu_luc_tu"]:
            return Status(False, f"{p['so_hieu']} chỉ có hiệu lực từ {p['hieu_luc_tu']}")
        end_known = True
        if known_on and p.get("can_cu_het_hieu_luc"):
            basis = self.provision(p["can_cu_het_hieu_luc"])
            proof_doc = self.document(basis["so_hieu"]) if basis else None
            end_known = bool(proof_doc and proof_doc.get("ngay_ban_hanh", "") <= known_on)
        if p["het_hieu_luc"] and on >= p["het_hieu_luc"] and end_known:
            replacements = tuple(r["tu_id"] for r in self.relations_to(pid)
                                 if r["loai"] in OVERRIDING and (r["hieu_luc_tu"] or "") <= on
                                 and (not known_on or r.get("ngay_ban_hanh", "") <= known_on))
            return Status(False, f"{p['so_hieu']} hết hiệu lực từ {p['het_hieu_luc']}", replacements)
        def known(r):
            if not known_on:
                return True
            source = self.provision(r["tu_id"])
            v = self.document(source["so_hieu"] if source else r["tu_id"]) or {}
            return v.get("ngay_ban_hanh", "") <= known_on

        overriding = [r for r in self.relations_to(pid)
                      if r["loai"] in OVERRIDING and r.get("pham_vi") != "bo_sung"
                      and (r["hieu_luc_tu"] or "") <= on and known(r)]
        if overriding:
            by = tuple(r["tu_id"] for r in overriding)
            kinds = ", ".join(sorted({r["loai"] for r in overriding}))
            return Status(False, f"đã bị {kinds} bởi {', '.join(by)}", by)
        return Status(True, "đang có hiệu lực")

    def search_on(self, query: str, on: str, limit: int = 8, known_on: str | None = None) -> list[dict]:
        """Search the bounded corpus and filter by legal date; no model or API key."""
        count = self.db.execute("SELECT COUNT(*) FROM dieu_khoan").fetchone()[0]
        result = []
        for pid in self.search(query, count):
            if self.status(pid, on, known_on).in_force:
                result.append(self.provision(pid))
                if len(result) >= limit:
                    break
        return result

    def trace(self, pid: str, include_references: bool = False) -> list[dict]:
        """Bidirectional amendment chain, cycle-safe, with evidence preserved."""
        pending, seen, edges = [pid], set(), []
        while pending:
            item = pending.pop()
            if item in seen:
                continue
            seen.add(item)
            for edge in self.relations_to(item) + self.relations_from(item):
                if not include_references and edge["loai"] not in OVERRIDING:
                    continue
                if edge not in edges:
                    edges.append(edge)
                    pending.extend([edge["tu_id"], edge["den_id"]])
        return edges

    def source_pages(self, pid: str) -> list[dict]:
        """Actual page fragments for a provision (including multi-part gazette mapping)."""
        p = self.provision(pid)
        if not p:
            return []
        name = p["so_hieu"].replace("Đ", "D").replace("/", "-")
        if name not in self._pages_cache:
            path = self.data_dir / "pages" / (name + ".json")
            self._pages_cache[name] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        pages = self._pages_cache[name]
        fragments = []
        for span in p.get("page_spans", []):
            pg = pages[span["trang"] - 1]
            fragments.append({"trang": span["trang"], "trang_nguon": pg["trang_nguon"],
                              "nguon_pdf": pg["nguon_url"] + f"#page={pg['trang_nguon']}",
                              "noi_dung": pg["text"][span["start"]:span["end"]]})
        return fragments

    def quote_locations(self, pid: str, quote: str) -> list[dict]:
        """Locate a quote across page boundaries; return only pages it actually occupies."""
        translate = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-"})
        def norm(s):
            return re.sub(r"\s+", " ", s.translate(translate)).strip().lower()
        pages = self.source_pages(pid)
        texts = [norm(p["noi_dung"]) for p in pages]
        target = norm(quote)
        start = " ".join(texts).find(target) if target else -1
        if start < 0:
            return []
        found, offset = [], 0
        for p, text in zip(pages, texts):
            if start < offset + len(text) and start + len(target) > offset:
                found.append({k: v for k, v in p.items() if k != "noi_dung"})
            offset += len(text) + 1
        return found
