"""Boundary and provenance tests for role A's real (not synthetic) corpus."""
import json
from pathlib import Path

import pytest

from lexvi.store import LawStore
from lexvi.verify import citation_problems
from scripts.audit_data import audit
from scripts.build_data import split

DATA = Path(__file__).resolve().parents[1] / "data"


@pytest.fixture(scope="module")
def real():
    return LawStore(DATA)


def test_real_corpus_provenance_graph_and_all_twenty_gold_answers():
    report = audit()
    assert report["loi"] == []
    assert report["so_van_ban"] == 30
    assert report["so_cau_hoi"] == 20
    assert report["so_cau_bay"] >= 5


def test_retroactive_rule_and_knowledge_date_are_different(real):
    pid = "141-2026-ND-CP-D1-K1"
    assert real.status(pid, "2026-01-01").in_force
    assert not real.status(pid, "2026-01-01", known_on="2026-04-28").in_force
    assert real.status(pid, "2026-01-01", known_on="2026-04-30").in_force
    old = "68-2026-ND-CP-D3-K1"
    assert real.status(old, "2026-04-01", known_on="2026-04-28").in_force
    assert not real.status(old, "2026-04-01").in_force


def test_delayed_clause_and_early_clause_do_not_inherit_document_date(real):
    assert real.status("48-2024-QH15-D18-K2", "2025-07-01").in_force
    assert not real.status("48-2024-QH15-D5-K25", "2025-07-01").in_force
    assert real.status("108-2025-QH15-D13-K6", "2026-01-01").in_force
    assert not real.status("108-2025-QH15-D14-K1", "2026-06-30").in_force


def test_ancestor_amendment_blocks_all_its_clauses_but_not_siblings(real):
    assert not real.status("68-2026-ND-CP-D3-K1", "2026-11-03").in_force
    assert not real.status("68-2026-ND-CP-D3-K2", "2026-11-03").in_force
    assert real.status("68-2026-ND-CP-D13-K1", "2026-11-03").in_force


def test_addition_does_not_invalidate_unmodified_existing_income_exemptions(real):
    assert real.status("320-2025-ND-CP-D4-K1", "2026-11-03").in_force


def test_expiration_uses_exclusive_next_day(real):
    assert real.status("174-2025-ND-CP-D2-K1", "2026-12-31").in_force
    assert not real.status("174-2025-ND-CP-D2-K1", "2027-01-01").in_force


def test_multi_page_quote_is_located_on_its_actual_page(real):
    pid = "43-2026-QH16-D1-K2"
    quote = "sau khi đã trừ ưu đãi thuế."
    assert real.provision(pid)["trang"] == 1
    assert real.quote_locations(pid, quote)[0]["trang"] == 2
    c = {"id": pid, "cau_trich": quote, "nhan_dinh": "Giảm sau ưu đãi", "trang": 1}
    assert any("số trang" in x for x in citation_problems(real, c, "2026-11-03"))
    assert not citation_problems(real, {**c, "trang": 2}, "2026-11-03")


def test_quoted_amended_numbering_and_annexes_are_not_root_articles():
    text = 'Điều 1. Sửa đổi\n1. Thay như sau:\n“Điều 9. Nội dung\n1. Đây là nội dung được sửa.”.\nĐiều 2. Hiệu lực\n1. Ngày áp dụng.\nKT. BỘ TRƯỞNG\nĐiều 3. Chữ trong mẫu biểu'
    src = {"so_hieu": "TEST", "hieu_luc_tu": "2026-01-01"}
    pages = [{"trang": 1, "text": text, "phuong_phap": "pdf_text"}]
    rows = split(src, pages)
    assert [r["id"] for r in rows] == ["TEST-D1", "TEST-D1-K1", "TEST-D2", "TEST-D2-K1"]
    assert "Điều 9" in rows[1]["noi_dung"]


def test_invalid_dates_raise_and_unknown_ids_are_rejected(real):
    with pytest.raises(ValueError):
        real.status("68-2026-ND-CP-D3-K1", "03/11/2026")
    assert not real.status("BOGUS", "2026-11-03").in_force


def test_offline_demo_has_a_real_source_and_a_replay_label():
    folder = DATA.parent / "demo" / "role_a"
    expected = json.loads((folder / "expected.json").read_text(encoding="utf-8"))
    assert expected["viec_goi_y"][0]["han"] is None
    assert "PHAT_LAI_LICH_SU" in expected["che_do"]
    assert (folder / "van-ban-moi-141-2026.pdf").read_bytes().startswith(b"%PDF")
