from pathlib import Path

import pytest

from lexvi.store import LawStore
from lexvi.verify import code_checks

FIXTURES = Path(__file__).parent / "fixtures"
OLD, NEW = "TEST-CU-D4-K1", "TEST-MOI-D2-K1"
OLD_QUOTE = "Cá nhân kinh doanh có doanh thu từ 100 triệu đồng/năm trở xuống"
NEW_QUOTE = "Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống"


@pytest.fixture(scope="module")
def store():
    return LawStore(FIXTURES)


def test_amended_provision_applies_before_amendment_date(store):
    assert store.status(OLD, "2025-06-30").in_force


def test_amended_provision_does_not_apply_after_amendment_and_points_to_new(store):
    status = store.status(OLD, "2026-03-01")
    assert not status.in_force
    assert status.replaced_by == (NEW,)


def test_new_provision_not_in_force_before_its_document_starts(store):
    assert not store.status(NEW, "2025-12-31").in_force
    assert store.status(NEW, "2026-01-01").in_force


def test_search_matches_without_diacritics(store):
    assert set(store.search("doanh thu mien thue")) >= {OLD, NEW}


def test_unknown_provision_is_not_in_force(store):
    assert not store.status("KHONG-CO", "2026-01-01").in_force


def answer(pid, quote, basis=None):
    return {"tra_loi": "x", "trich_dan": [{"id": pid, "cau_trich": quote, "nhan_dinh": "y"}],
            "checklist": [{"viec": "z", "han": "", "can_cu": basis or pid}]}


def test_code_checks_accept_valid_current_citation(store):
    assert code_checks(store, answer(NEW, NEW_QUOTE), "2026-03-01") == []


def test_code_checks_reject_stale_citation_and_suggest_replacement(store):
    problems = code_checks(store, answer(OLD, OLD_QUOTE), "2026-03-01")
    assert len(problems) == 1 and NEW in problems[0]


def test_code_checks_reject_paraphrased_quote(store):
    problems = code_checks(store, answer(NEW, "Hộ kinh doanh doanh thu dưới 500 triệu được miễn thuế"), "2026-03-01")
    assert any("nguyên văn" in p for p in problems)


def test_code_checks_reject_checklist_basis_not_cited(store):
    problems = code_checks(store, answer(NEW, NEW_QUOTE, basis="TEST-CU-D9"), "2026-03-01")
    assert any("checklist" in p for p in problems)


def test_code_checks_reject_answer_without_citations(store):
    assert code_checks(store, {"tra_loi": "x", "trich_dan": [], "checklist": []}, "2026-03-01")
