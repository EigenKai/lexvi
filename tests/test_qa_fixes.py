"""Regression tests for the QA findings of 2026-11-04 (ported from the QA repro suite).

All offline: the model is tests/fake_model.FakeClient; no network, no API key.
"""
import io
import json
import os
import threading
import unicodedata
from pathlib import Path

import httpx
import openai
import pytest
from pypdf import PdfWriter

from lexvi import agent, config, ingest, tools, verify
from lexvi.store import LawStore
from lexvi.verify import code_checks, is_verbatim, normalize
from scripts import run_eval
from tests.fake_model import FakeClient, call, raw_call

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures"
DATA = ROOT / "data"
DEMO_PDF = ROOT / "demo" / "role_a" / "van-ban-moi-141-2026.pdf"
OLD, NEW = "TEST-CU-D4-K1", "TEST-MOI-D2-K1"
OLD_QUOTE = "Cá nhân kinh doanh có doanh thu từ 100 triệu đồng/năm trở xuống"
NEW_QUOTE = "Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống"
PROFILE = {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 400_000_000, "dia_ban": "TP.HCM"}
ON = "2026-03-01"
# The demo threshold rule: Decree 68 Art. 3(1), amended by a phrase replacement in Decree 141 Art. 1(1).
AMENDED, AMENDING = "68-2026-ND-CP-D3-K1", "141-2026-ND-CP-D1-K1"
AMENDED_QUOTE = ("Hộ kinh doanh, cá nhân kinh doanh có hoạt động sản xuất, kinh doanh có mức doanh thu năm từ "
                 "500 triệu đồng trở xuống thuộc đối tượng không chịu thuế giá trị gia tăng.")
AMENDING_QUOTE = "Sửa đổi cụm từ “500 triệu đồng” thành “01 tỷ đồng”"


@pytest.fixture(autouse=True)
def tmp_runs(tmp_path, monkeypatch):
    monkeypatch.setattr(agent, "RUNS_DIR", tmp_path / "runs")


@pytest.fixture
def store():
    return LawStore(FIXTURES)


@pytest.fixture(scope="module")
def real():
    return LawStore(DATA)


def cit(pid, quote, claim="ngưỡng miễn thuế"):
    return {"id": pid, "cau_trich": quote, "nhan_dinh": claim}


def submit(cits, checklist=None, text="Không phải nộp thuế GTGT."):
    return call("nop_cau_tra_loi", tra_loi=text, trich_dan=cits, checklist=checklist or [])


def ok(n=1):
    return {"ket_qua": [{"so_thu_tu": i, "ung_ho": True, "ly_do": ""} for i in range(1, n + 1)],
            "tong_the": {"ung_ho": True, "ly_do": ""}}


def record(out):
    return json.loads((agent.RUNS_DIR / f"{out['run_id']}.json").read_text(encoding="utf-8"))


def blank_pdf(pages):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def change(excerpt, target=OLD):
    return {"trich_doan": excerpt, "loai": "sua_doi", "dieu_bi_tac_dong": target, "anh_huong_toi_ho_so": True,
            "giai_thich": "g", "viec_can_lam": "Kiểm tra lại doanh thu", "han": ""}


def result(*changes):
    return {"van_ban_moi": {"so_hieu": "141/2026/NĐ-CP", "tieu_de": "t", "hieu_luc_tu": "2026-01-01"},
            "thay_doi": list(changes)}


# ---- I1: date-aware search and turn budget -------------------------------------------------------

def test_search_lists_in_force_first_then_stale_hits_with_their_replacement(store):
    ctx = tools.Context(client=None, store=store, on=ON, profile=PROFILE)
    hits = tools.run(ctx, call("tim_dieu_khoan", truy_van="doanh thu miễn thuế"))["ket_qua"]
    assert [h["id"] for h in hits][:1] == [NEW] and hits[0]["ap_dung_ngay_hoi"]
    stale = [h for h in hits if not h["ap_dung_ngay_hoi"]]
    assert [h["id"] for h in stale] == [OLD] and stale[0]["xem_thay"] == [NEW]


def test_real_search_puts_current_provisions_first_and_caps_stale_hits(real):
    ctx = tools.Context(client=None, store=real, on="2026-11-04", profile=PROFILE)
    hits = tools.run(ctx, call("tim_dieu_khoan", truy_van="ngưỡng doanh thu không chịu thuế giá trị gia tăng"))["ket_qua"]
    flags = [h["ap_dung_ngay_hoi"] for h in hits]
    assert flags and flags[0] and flags == sorted(flags, reverse=True)
    stale = [h for h in hits if not h["ap_dung_ngay_hoi"]]
    assert len(stale) <= tools.STALE_HITS and all(h.get("xem_thay") for h in stale)


def test_turn_budget_is_stated_and_nudged_three_turns_before_the_end(store):
    assert agent.MAX_TURNS == 20
    client = FakeClient([call("doc_ho_so")] * 6)
    out = agent.ask(client, store, "Ngưỡng?", ON, PROFILE, max_turns=6)
    assert "tối đa 6 lượt" in client.requests[0]["input"][0]["content"]

    def says(req, text):
        return any(isinstance(m, dict) and text in str(m.get("content", "")) for m in req["input"])
    assert [says(r, "Chỉ còn") for r in client.requests] == [False, False, True, True, True, True]
    assert [says(r, "lượt cuối") for r in client.requests] == [False] * 5 + [True]
    assert out["trang_thai"] == "turn_limit"


# ---- I2: a partly amended clause is citable together with its amending clause --------------------

def test_phrase_replacement_marks_the_clause_amended_not_replaced(real):
    s = real.status(AMENDED, "2026-11-04")
    assert not s.in_force and s.amended_by == (AMENDING,)
    whole = real.status("68-2026-ND-CP-D8-K5", "2026-11-04")  # rewritten in full by 141 Art. 1(2)
    assert not whole.in_force and whole.amended_by == ()


def test_amended_clause_passes_only_when_cited_with_its_amending_clause(real):
    alone = {"tra_loi": "Ngưỡng là 01 tỷ đồng.", "trich_dan": [cit(AMENDED, AMENDED_QUOTE)], "checklist": []}
    problems = code_checks(real, alone, "2026-11-04")
    assert problems and AMENDING in problems[0] and "trích kèm" in problems[0]
    both = {**alone, "trich_dan": [cit(AMENDED, AMENDED_QUOTE), cit(AMENDING, AMENDING_QUOTE)]}
    assert code_checks(real, both, "2026-11-04") == []


def test_agent_answers_with_the_amended_clause_and_marks_it_read_together(real):
    client = FakeClient([submit([cit(AMENDED, AMENDED_QUOTE), cit(AMENDING, AMENDING_QUOTE)],
                                text="Hộ có doanh thu năm từ 01 tỷ đồng trở xuống không chịu thuế GTGT."), ok(2)])
    out = agent.ask(client, real, "Ngưỡng không chịu thuế GTGT năm 2026?", "2026-11-04", PROFILE)
    assert out["trang_thai"] == "answered", out
    first = out["trich_dan"][0]
    assert first["tinh_trang"].startswith("đang có hiệu lực (đã được sửa đổi bởi " + AMENDING)
    assert first["ap_dung_ngay_hoi"] is True
    judge_prompt = client.requests[-1]["input"]
    assert f"Đọc kèm điều khoản sửa đổi {AMENDING}" in judge_prompt
    assert "Ngưỡng không chịu thuế GTGT năm 2026?" in judge_prompt


def test_eval_does_not_count_a_correctly_paired_amended_clause_as_outdated(real):
    q = {"ngay_ap_dung": "2026-11-04", "dieu_dung": [AMENDING]}
    paired = run_eval.score(real, q, {"trich_dan": [cit(AMENDED, AMENDED_QUOTE), cit(AMENDING, AMENDING_QUOTE)]})
    alone = run_eval.score(real, q, {"trich_dan": [cit(AMENDED, AMENDED_QUOTE)]})
    assert not paired["dan_dieu_cu"] and alone["dan_dieu_cu"]


# ---- I3 / M-B3: /ingest excerpt checks ------------------------------------------------------------

def test_correct_excerpt_from_the_demo_pdf_is_found_despite_pypdf_spacing(store):
    pages = ingest.pdf_text(DEMO_PDF.read_bytes())
    sentence = "Sửa đổi cụm từ “500 triệu đồng” thành “01 tỷ đồng” tại Điều 3, Điều 4, khoản 1 Điều 8"
    out = ingest.check(store, result(change(sentence)), "\n".join(pages))
    assert out["dieu_bi_anh_huong"] and not out["bi_loai"]


def test_excerpt_spanning_a_page_break_is_kept(store):
    pages = ["Hộ kinh doanh có doanh thu từ 1 tỷ đồng", "trở xuống không phải nộp thuế."]
    out = ingest.check(store, result(change("doanh thu từ 1 tỷ đồng trở xuống không phải nộp thuế")), "\n".join(pages))
    assert out["dieu_bi_anh_huong"]


@pytest.mark.parametrize("excerpt", ["", "Điều 1"])
def test_empty_or_tiny_excerpt_is_dropped(store, excerpt):
    out = ingest.check(store, result(change(excerpt)), "Điều 1. Văn bản mới có nội dung dài.")
    assert out["dieu_bi_anh_huong"] == [] and out["bi_loai"]


def test_long_scanned_pdf_is_rejected_before_any_model_call(store):
    client = FakeClient([result()])
    with pytest.raises(ValueError):
        ingest.analyze(client, store, blank_pdf(25), {})
    assert client.requests == []


# ---- H2: candidate pre-filter ---------------------------------------------------------------------

def test_ingest_prompt_lists_a_short_candidate_set_with_the_real_targets(real):
    plain = "\n".join(ingest.pdf_text(DEMO_PDF.read_bytes()))
    assert "141/2026/NĐ-CP" not in ingest._doc_numbers(plain)  # its own number is not a target
    ids = ingest._candidates(real, plain)
    assert len(ids) <= ingest.MAX_CANDIDATES
    assert {"68-2026-ND-CP-D3-K1", "68-2026-ND-CP-D4-K1", "68-2026-ND-CP-D8-K1", "68-2026-ND-CP-D8-K5"} <= set(ids)
    assert len(ingest._catalog(real, ids)) < 40_000


def test_doc_numbers_tolerate_pypdf_spaces():
    assert ingest._doc_numbers("theo Nghị định số 68/2026/NĐ- CP và Luật 09/ 2026/QH16") == ["68/2026/NĐ-CP",
                                                                                            "09/2026/QH16"]


# ---- I4 / H1: threads ---------------------------------------------------------------------------

def test_shared_store_is_safe_under_threads(store):
    errors = []

    def work():
        try:
            for _ in range(300):
                assert set(store.search("doanh thu miễn thuế")) >= {OLD, NEW}
                assert not store.status(OLD, ON).in_force
                assert store.provision(NEW)["so_hieu"] == "TEST-MOI"
        except Exception as error:  # noqa: BLE001
            errors.append(repr(error))

    threads = [threading.Thread(target=work) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []


# ---- H3: citation dates and relations --------------------------------------------------------------

def test_render_carries_dates_retroactivity_and_split_relations(real):
    out = agent._render(real, {"trich_dan": [cit(AMENDING, AMENDING_QUOTE)], "can_xac_nhan": False}, "2026-11-04")
    c = out["trich_dan"][0]
    assert c["ngay_ban_hanh"] > c["hieu_luc_tu"] == "2026-01-01" and c["hoi_to"] is True
    assert c["ap_dung_ngay_hoi"] is True and c["het_hieu_luc"] is None
    assert c["sua_doi_toi"] and all(e["den_id"].startswith("68-2026-ND-CP") and e["hoi_to"] for e in c["sua_doi_toi"])
    assert all(e["loai"] == "dan_chieu" for e in c["dan_chieu"])
    assert "chuoi_sua_doi" in c


def test_render_survives_a_missing_pages_file(tmp_path):
    d = tmp_path / "store"
    d.mkdir()
    for name in ("van_ban", "quan_he"):
        (d / f"{name}.json").write_text((FIXTURES / f"{name}.json").read_text(encoding="utf-8"), encoding="utf-8")
    rows = json.loads((FIXTURES / "dieu_khoan.json").read_text(encoding="utf-8"))
    rows[2]["page_spans"] = [{"trang": 1, "start": 0, "end": 20}]
    (d / "dieu_khoan.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    st = LawStore(d)
    out = agent._render(st, {"trich_dan": [cit(NEW, NEW_QUOTE)]}, ON)
    assert out["trich_dan"][0]["vi_tri_nguon"] == []


# ---- H4 / M-B2: robustness of the loop ------------------------------------------------------------

def test_malformed_json_arguments_do_not_crash_the_run(store):
    client = FakeClient([raw_call("tim_dieu_khoan", '{"truy_van": "ngưỡng'), submit([cit(NEW, NEW_QUOTE)]), ok()])
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", ON, PROFILE)
    assert out["trang_thai"] == "answered"
    assert record(out)["steps"][0]["args"] == {"_raw": '{"truy_van": "ngưỡng'}


def test_run_is_saved_even_when_the_loop_crashes(store):
    client = FakeClient([call("doc_ho_so"), RuntimeError("boom")])
    with pytest.raises(RuntimeError):
        agent.ask(client, store, "Ngưỡng?", ON, PROFILE)
    saved = [json.loads(p.read_text(encoding="utf-8")) for p in agent.RUNS_DIR.glob("*.json")]
    assert len(saved) == 1 and saved[0]["output"]["trang_thai"] == "loi"


def test_several_tool_calls_in_one_turn_each_get_an_output(store):
    two = [raw_call("doc_ho_so", "{}", "call-1"), raw_call("doc_dieu_khoan", json.dumps({"id": NEW}), "call-2")]
    client = FakeClient([two, submit([cit(NEW, NEW_QUOTE)]), ok()])
    agent.ask(client, store, "Ngưỡng?", ON, PROFILE)
    nxt = client.requests[1]["input"]
    calls = {getattr(i, "call_id", None) for i in nxt if getattr(i, "type", None) == "function_call"}
    outputs = {i["call_id"]: i["output"] for i in nxt if isinstance(i, dict) and i.get("type") == "function_call_output"}
    assert calls <= set(outputs) and "Mỗi lượt chỉ chạy một tool" in outputs["call-2"]


# ---- H7: Vietnamese with diacritics, the question goes to the judge --------------------------------

def test_answer_without_diacritics_is_refused(store):
    answer = {"tra_loi": "Ho kinh doanh co doanh thu duoi nguong thi khong phai nop thue.",
              "trich_dan": [cit(NEW, NEW_QUOTE)], "checklist": []}
    assert any("có dấu" in p for p in code_checks(store, answer, ON))
    assert code_checks(store, {**answer, "tra_loi": "x"}, ON) == []  # too short to judge


def test_judge_prompt_states_the_question_and_the_directness_criterion(store):
    client = FakeClient([ok()])
    verify.judge(client, store, {"tra_loi": "Có.", "trich_dan": [cit(NEW, NEW_QUOTE)]}, ON, "Quán tôi có phải nộp?")
    prompt = client.requests[0]["input"]
    assert "Quán tôi có phải nộp?" in prompt and "lạc đề" in prompt


# ---- M-B4: boundary-aware verbatim check --------------------------------------------------------

def test_verbatim_check_rejects_a_fragment_that_drops_the_negation(store):
    problems = code_checks(store, {"tra_loi": "Có.", "trich_dan": [cit(NEW, "phải nộp thuế giá trị gia tăng")],
                                   "checklist": []}, ON)
    assert any("nguyên văn" in p for p in problems)


def test_verbatim_check_rejects_a_fragment_starting_mid_number():
    assert not is_verbatim("00 triệu đồng/năm trở xuống", NEW_QUOTE)
    assert not is_verbatim("Hộ kinh doanh có doanh thu từ 50", NEW_QUOTE)
    assert is_verbatim("doanh thu từ 500 triệu đồng/năm", NEW_QUOTE)


def test_nfd_quote_of_a_verbatim_sentence_is_accepted(store):
    answer = {"tra_loi": "Không.", "trich_dan": [cit(NEW, unicodedata.normalize("NFD", NEW_QUOTE))], "checklist": []}
    assert code_checks(store, answer, ON) == []


# ---- M-B7: đ→d folding and NFC in search ----------------------------------------------------------

def test_search_folds_d_bar_and_nfd(store, real):
    assert set(store.search("trieu dong")) >= {OLD, NEW}
    assert len(real.search("dong", limit=5000)) == len(real.search("đồng", limit=5000))
    q = "người nộp thuế hộ kinh doanh doanh thu"
    assert real.search(unicodedata.normalize("NFD", q)) == real.search(q)


# ---- M-B5: configuration -------------------------------------------------------------------------

KEYS = ["QA_K1", "QA_K2", "QA_K3"]


@pytest.fixture
def clean_env(monkeypatch):
    for k in KEYS:
        monkeypatch.delenv(k, raising=False)
    yield
    for k in KEYS:
        os.environ.pop(k, None)


@pytest.mark.parametrize("raw,expected", [
    (b"QA_K1=https://api.example.test/v1  # base url\n", "https://api.example.test/v1"),
    (b'QA_K1="secret value"\n', "secret value"),
    (b"QA_K1='single' # note\n", "single"),
    (b"\xef\xbb\xbfQA_K1=abc\n", "abc"),
    ("QA_K1=abc\r\n".encode("utf-16"), "abc"),
    (b"export QA_K1=abc\n", "abc"),
    (b"QA_K1=x=y#z\n", "x=y#z"),
])
def test_dotenv_parser(tmp_path, clean_env, raw, expected):
    path = tmp_path / "dotenv_sample.txt"  # never a file named .env
    path.write_bytes(raw)
    config._load_dotenv(path)
    assert os.environ.get("QA_K1") == expected


def test_process_environment_wins_over_the_file(tmp_path, clean_env, monkeypatch):
    monkeypatch.setenv("QA_K2", "from-env")
    path = tmp_path / "dotenv_sample.txt"
    path.write_bytes(b"QA_K2=from-file\n")
    config._load_dotenv(path)
    assert os.environ["QA_K2"] == "from-env"


def test_data_dir_is_read_after_the_dotenv_file():
    src = (ROOT / "lexvi" / "config.py").read_text(encoding="utf-8")
    assert src.index('_load_dotenv(ROOT / ".env")') < src.index("DATA_DIR = ")


def test_store_on_a_missing_directory_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        LawStore(tmp_path / "does-not-exist")


# ---- M-B6: eval scoring ---------------------------------------------------------------------------

Q = {"cau_hoi": "q", "ngay_ap_dung": ON, "dieu_dung": [NEW]}


def test_score_counts_made_up_ids_separately(store):
    s = run_eval.score(store, Q, {"trich_dan": [cit("48-2024-QH15-D99-K9", "bất kỳ câu nào ở đây")]})
    assert s["id_bia"] and not s["dan_dieu_cu"]


def test_score_empty_quote_is_a_bad_quote_and_fallback_is_no_answer(store):
    assert run_eval.score(store, Q, {"trich_dan": [cit(NEW, "")]})["trich_sai"]
    s = run_eval.score(store, Q, {"trich_dan": [], "can_xac_nhan": True, "trang_thai": "turn_limit"})
    assert s["khong_tra_loi"] and s["trang_thai"] == "turn_limit" and not s["dan_dieu_cu"]


def test_score_stale_and_current_citations(store):
    assert run_eval.score(store, Q, {"trich_dan": [cit(OLD, OLD_QUOTE)]})["dan_dieu_cu"]
    s = run_eval.score(store, Q, {"trich_dan": [cit(NEW, NEW_QUOTE)]})
    assert s["dung_can_cu"] and not s["dan_dieu_cu"] and not s["trich_sai"]


# ---- Lows: terminal statuses, fallback text, no basis, cancel --------------------------------------

def test_turn_limit_after_a_refused_submit_is_a_terminal_status(store):
    client = FakeClient([call("doc_ho_so"), submit([cit(OLD, OLD_QUOTE)])])
    out = agent.ask(client, store, "Ngưỡng?", ON, PROFILE, max_turns=2)
    assert out["trang_thai"] == "turn_limit" and out["can_xac_nhan"] and out["trich_dan"] == []


def test_api_error_fallback_does_not_look_like_no_legal_basis(store):
    err = openai.APIConnectionError(request=httpx.Request("POST", "http://127.0.0.1:9/v1/responses"))
    out = agent.ask(FakeClient([err]), store, "Ngưỡng?", ON, PROFILE)
    assert out["trang_thai"] == "api_error" and "không kết nối được" in out["tra_loi"]
    assert "căn cứ" not in out["tra_loi"]


def test_no_basis_ends_flagged_after_two_searches(store):
    no_basis = submit([], text="Chưa tìm thấy căn cứ trong kho cho thủ tục đăng ký kết hôn.")
    client = FakeClient([no_basis, call("tim_dieu_khoan", truy_van="kết hôn"),
                         call("tim_dieu_khoan", truy_van="đăng ký hộ tịch"), no_basis])
    out = agent.ask(client, store, "Đăng ký kết hôn thế nào?", ON, PROFILE)
    assert out["trang_thai"] == "no_basis" and out["can_xac_nhan"] and out["trich_dan"] == []
    first = record(out)["steps"][0]["result"]
    assert "error" in first and "van_de" not in first  # the early attempt is not a refusal


def test_cancel_stops_the_run_before_the_next_turn(store):
    cancel = threading.Event()

    class Client(FakeClient):
        def create(self, **kwargs):
            cancel.set()  # the client goes away during the first model call
            return super().create(**kwargs)

    client = Client([call("doc_ho_so"), call("doc_ho_so")])
    out = agent.ask(client, store, "Ngưỡng?", ON, PROFILE, cancel=cancel)
    assert out["trang_thai"] == "cancelled" and len(client.requests) == 1 and out["can_xac_nhan"]


def test_normalize_is_nfc():
    assert normalize(unicodedata.normalize("NFD", NEW_QUOTE)) == normalize(NEW_QUOTE)
