"""lexvi.limits: the spend budget, per-visitor windows, the busy cap and the usage meter. No network."""
from types import SimpleNamespace

import pytest

from lexvi.limits import DAY, Limits, Metered, Prices, Refused, parse_windows, visitor_key


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_parse_windows():
    assert parse_windows("4/h, 10/d") == [(4, 3600), (10, 86400)]
    assert parse_windows("") == []
    for bad in ("4", "4/w", "x/h", "0/h", "-1/h"):
        with pytest.raises(ValueError):
            parse_windows(bad)


def test_everything_is_off_without_env():
    limits = Limits.from_env({})
    assert not limits.active
    for _ in range(50):  # nothing is ever refused
        limits.release(limits.admit("ask", "a"), usd=5.0)


def test_from_env_reads_every_setting():
    limits = Limits.from_env({"LEXVI_BUDGET_USD_DAY": "10", "LEXVI_LIMIT_ASK": "4/h,10/d",
                              "LEXVI_LIMIT_INGEST": "2/h", "LEXVI_MAX_BUSY": "3"})
    assert limits.active and limits.budget == 10 and limits.max_busy == 3
    assert limits.per_visitor == {"ask": [(4, 3600), (10, 86400)], "ingest": [(2, 3600)]}
    with pytest.raises(ValueError):
        Limits.from_env({"LEXVI_BUDGET_USD_DAY": "-1"})


def test_per_visitor_windows_slide_and_are_separate():
    clock = Clock()
    limits = Limits(per_visitor={"ask": [(2, 3600), (3, DAY)]}, clock=clock)
    for _ in range(2):
        limits.release(limits.admit("ask", "a"), 0.1)
    with pytest.raises(Refused) as refused:
        limits.admit("ask", "a")
    assert refused.value.reason == "visitor" and refused.value.retry_after == 3600
    limits.release(limits.admit("ask", "b"), 0.1)  # another visitor is unaffected
    limits.release(limits.admit("ingest", "a"), 0.1)  # and so is another kind
    clock.now += 3600
    limits.release(limits.admit("ask", "a"), 0.1)  # the hourly window has moved on...
    with pytest.raises(Refused) as refused:  # ...but this is the third today
        limits.admit("ask", "a")
    assert refused.value.retry_after == DAY - 3600


def test_budget_is_shared_and_frees_up_after_24_hours():
    clock = Clock()
    limits = Limits(budget_usd_day=1.0, clock=clock)
    limits.release(limits.admit("ask", "a"), 0.6)
    clock.now += 100
    limits.release(limits.admit("ingest", "b"), 0.6)
    with pytest.raises(Refused) as refused:
        limits.admit("ask", "c")
    assert refused.value.reason == "budget" and refused.value.retry_after == DAY - 100
    assert limits.spent() == pytest.approx(1.2)
    clock.now += DAY - 100  # the first 0.6 leaves the window
    limits.release(limits.admit("ask", "c"), 0.0)


def test_zero_budget_turns_the_live_demo_off():
    limits = Limits(budget_usd_day=0.0)
    with pytest.raises(Refused):
        limits.admit("ask", "a")


def test_busy_cap_counts_requests_in_flight():
    limits = Limits(max_busy=1)
    ticket = limits.admit("ask", "a")
    with pytest.raises(Refused) as refused:
        limits.admit("ingest", "b")
    assert refused.value.reason == "busy"
    limits.release(ticket, 0.0)
    limits.release(limits.admit("ingest", "b"), 0.0)


def test_refund_uncounts_a_request_that_never_reached_the_model():
    limits = Limits(per_visitor={"ingest": [(1, 3600)]})
    limits.release(limits.admit("ingest", "a"), 0.0, refund=True)
    limits.release(limits.admit("ingest", "a"), 0.0)  # still allowed: the first was refunded
    with pytest.raises(Refused):
        limits.admit("ingest", "a")


def test_visitor_key_prefers_the_proxy_headers():
    assert visitor_key({"cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2"}, "3.3.3.3") == "1.1.1.1"
    assert visitor_key({"true-client-ip": "4.4.4.4"}, "3.3.3.3") == "4.4.4.4"
    assert visitor_key({"x-forwarded-for": "2.2.2.2, 10.0.0.1"}, "3.3.3.3") == "2.2.2.2"
    assert visitor_key({}, "3.3.3.3") == "3.3.3.3"
    assert visitor_key({}, None) == "unknown"


class FakeResponses:
    def __init__(self, usages):
        self.usages = list(usages)
        self.responses = self

    def create(self, **kwargs):
        return SimpleNamespace(output=[], output_text="", usage=self.usages.pop(0))


def test_meter_adds_up_tokens_and_prices_them():
    usage = SimpleNamespace(input_tokens=1000, output_tokens=100,
                            input_tokens_details=SimpleNamespace(cached_tokens=400))
    meter = Metered(FakeResponses([usage, None]), Prices())
    meter.responses.create(model="m", input="x")
    meter.responses.create(model="m", input="y")  # a response without usage counts at the fallback
    # 600 fresh x 1.25 + 400 cached x 0.15 + 100 out x 4.25, per million, plus one unmetered call
    assert meter.cost_usd() == pytest.approx((600 * 1.25 + 400 * 0.15 + 100 * 4.25) / 1e6 + 0.05)
    assert meter.summary() == {"so_lan_goi": 2, "token_vao": 1000, "token_cache": 400, "token_ra": 100,
                               "chi_phi_uoc_tinh_usd": meter.cost_usd()}


def test_meter_passes_other_attributes_through():
    inner = FakeResponses([])
    inner.models = "the models endpoint"
    assert Metered(inner, Prices()).models == "the models endpoint"


def test_prices_from_env():
    assert Prices.from_env({}) == Prices()
    assert Prices.from_env({"LEXVI_PRICE_OUT": "2"}).output == 2.0
