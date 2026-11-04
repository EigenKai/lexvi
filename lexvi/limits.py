"""Optional limits for a public deployment, plus a usage meter for every model call.

Each limit is off unless its environment variable is set, so local runs, the tests and the eval
behave exactly as before:

    LEXVI_BUDGET_USD_DAY=10       estimated spend of all visitors together over a rolling 24 h
    LEXVI_LIMIT_ASK=4/h,10/d      per visitor, sliding windows (units s, m, h, d)
    LEXVI_LIMIT_INGEST=2/h,3/d
    LEXVI_MAX_BUSY=3              /ask and /ingest requests running at once

Prices are USD per 1M tokens. The defaults are muse-spark-1.3 in Standard mode, from
https://dev.meta.ai/docs/pricing-rate-limits (checked 04/11/2026). LEXVI_PRICE_IN, LEXVI_PRICE_CACHED and
LEXVI_PRICE_OUT override them; LEXVI_PRICE_UNMETERED_CALL is charged for a response that reports no usage.

The state lives in this process, so run one uvicorn worker. A restart (a redeploy, or a sleeping
free instance waking up) starts the counters from zero.
"""

from __future__ import annotations

import logging
import math
import os
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Callable, Mapping

UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}
DAY = 86400
KINDS = ("ask", "ingest")
log = logging.getLogger("lexvi.limits")


def parse_windows(spec: str) -> list[tuple[int, int]]:
    """'4/h,10/d' -> [(4, 3600), (10, 86400)]."""
    windows = []
    for part in (p.strip() for p in spec.split(",")):
        if not part:
            continue
        count, _, unit = part.partition("/")
        if unit.strip() not in UNITS or not count.strip().isdigit() or int(count) < 1:
            raise ValueError(f"bad limit {part!r}: write N/s, N/m, N/h or N/d with N >= 1")
        windows.append((int(count), UNITS[unit.strip()]))
    return windows


def _number(env: Mapping[str, str], name: str, default: float | None) -> float | None:
    raw = (env.get(name) or "").strip()
    if not raw:
        return default
    value = float(raw)
    if value < 0 or math.isnan(value):
        raise ValueError(f"{name} must be a number >= 0")
    return value


def visitor_key(headers: Mapping[str, str], peer: str | None) -> str:
    """Who is asking, for the per-visitor limits. Proxy headers first (Render sits behind Cloudflare).

    A client can forge these headers to look like several visitors; the shared budget still holds.
    """
    for name in ("cf-connecting-ip", "true-client-ip"):
        value = (headers.get(name) or "").strip()
        if value:
            return value[:64]
    first = (headers.get("x-forwarded-for") or "").split(",")[0].strip()
    return (first or peer or "unknown")[:64]


class Refused(Exception):
    """A request the limits turned away; `retry_after` is in whole seconds."""

    def __init__(self, reason: str, retry_after: float):
        super().__init__(reason)
        self.reason = reason  # "busy" | "budget" | "visitor"
        self.retry_after = max(1, math.ceil(retry_after))


@dataclass(frozen=True)
class Ticket:
    kind: str
    visitor: str
    at: float


class Limits:
    def __init__(self, budget_usd_day: float | None = None,
                 per_visitor: Mapping[str, list[tuple[int, int]]] | None = None,
                 max_busy: int | None = None, clock: Callable[[], float] = time.monotonic):
        self.budget = budget_usd_day
        self.per_visitor = {k: v for k, v in (per_visitor or {}).items() if v}
        self.max_busy = max_busy
        self.clock = clock
        self._lock = threading.Lock()
        self._spend: deque[tuple[float, float]] = deque()  # (time, usd), oldest first
        self._hits: dict[tuple[str, str], deque[float]] = {}
        self._busy = 0

    @classmethod
    def from_env(cls, env: Mapping[str, str] = os.environ) -> "Limits":
        busy = _number(env, "LEXVI_MAX_BUSY", None)
        return cls(
            budget_usd_day=_number(env, "LEXVI_BUDGET_USD_DAY", None),
            per_visitor={k: parse_windows(env.get(f"LEXVI_LIMIT_{k.upper()}", "")) for k in KINDS},
            max_busy=None if busy is None else max(1, int(busy)),
        )

    @property
    def active(self) -> bool:
        return self.budget is not None or bool(self.per_visitor) or self.max_busy is not None

    def describe(self) -> str:
        visitor = "; ".join(f"{k} {', '.join(f'{n}/{s}s' for n, s in w)}" for k, w in self.per_visitor.items())
        return (f"budget {self.budget if self.budget is not None else 'off'} USD/24h; "
                f"per visitor {visitor or 'off'}; busy {self.max_busy or 'off'}")

    def spent(self) -> float:
        with self._lock:
            self._trim_spend(self.clock())
            return sum(usd for _, usd in self._spend)

    def admit(self, kind: str, visitor: str) -> Ticket:
        """Take a slot or raise Refused. Every Ticket must be given back with release()."""
        now = self.clock()
        with self._lock:
            if self.max_busy is not None and self._busy >= self.max_busy:
                raise Refused("busy", 20)
            if self.budget is not None:
                self._trim_spend(now)
                spent = sum(usd for _, usd in self._spend)
                if spent >= self.budget:
                    raise Refused("budget", self._budget_frees_at(spent) - now)
            windows = self.per_visitor.get(kind)
            if windows:
                if len(self._hits) > 4096:
                    self._sweep(now)
                hits = self._hits.setdefault((kind, visitor), deque())
                longest = max(seconds for _, seconds in windows)
                while hits and now - hits[0] >= longest:
                    hits.popleft()
                for count, seconds in windows:
                    recent = [t for t in hits if now - t < seconds]
                    if len(recent) >= count:
                        raise Refused("visitor", recent[-count] + seconds - now)
                hits.append(now)
            self._busy += 1
        return Ticket(kind, visitor, now)

    def release(self, ticket: Ticket, usd: float, refund: bool = False) -> None:
        """Give the slot back and record what the request cost. `refund` un-counts the visitor's hit
        (for a request that never reached the model, such as an unreadable PDF)."""
        with self._lock:
            self._busy = max(0, self._busy - 1)
            if self.budget is not None and usd > 0:
                self._spend.append((self.clock(), usd))
            if refund:
                hits = self._hits.get((ticket.kind, ticket.visitor))
                if hits and ticket.at in hits:
                    hits.remove(ticket.at)

    def _trim_spend(self, now: float) -> None:
        while self._spend and now - self._spend[0][0] >= DAY:
            self._spend.popleft()

    def _budget_frees_at(self, spent: float) -> float:
        """When enough of the oldest spend leaves the 24 h window to bring the total under budget."""
        for at, usd in self._spend:
            spent -= usd
            if spent < self.budget:
                return at + DAY
        return self.clock() + DAY

    def _sweep(self, now: float) -> None:
        for key in list(self._hits):
            longest = max(s for _, s in self.per_visitor.get(key[0], [(0, 0)]))
            hits = self._hits[key]
            while hits and now - hits[0] >= longest:
                hits.popleft()
            if not hits:
                del self._hits[key]


@dataclass(frozen=True)
class Prices:
    """USD per 1M tokens, and per call that reports no usage."""

    input: float = 1.25
    cached: float = 0.15
    output: float = 4.25
    unmetered_call: float = 0.05

    @classmethod
    def from_env(cls, env: Mapping[str, str] = os.environ) -> "Prices":
        d = cls()
        return cls(_number(env, "LEXVI_PRICE_IN", d.input), _number(env, "LEXVI_PRICE_CACHED", d.cached),
                   _number(env, "LEXVI_PRICE_OUT", d.output),
                   _number(env, "LEXVI_PRICE_UNMETERED_CALL", d.unmetered_call))


class Metered:
    """Wraps the model client for one request and adds up the tokens of every responses.create call.

    The agent, the judge and /ingest all call `client.responses.create`, so passing a Metered
    client covers them; anything else is passed through to the real client.
    """

    def __init__(self, client: Any, prices: Prices):
        self._client = client
        self._prices = prices
        self._lock = threading.Lock()
        self.calls = self.unmetered = self.input_tokens = self.cached_tokens = self.output_tokens = 0
        self.responses = self

    def __getattr__(self, name: str) -> Any:  # only reached for attributes not set above
        return getattr(self._client, name)

    def create(self, **kwargs: Any) -> Any:
        response = self._client.responses.create(**kwargs)
        usage = getattr(response, "usage", None)
        with self._lock:
            self.calls += 1
            if usage is None:
                self.unmetered += 1
            else:
                details = getattr(usage, "input_tokens_details", None)
                self.input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
                self.cached_tokens += int(getattr(details, "cached_tokens", 0) or 0)
                self.output_tokens += int(getattr(usage, "output_tokens", 0) or 0)
        return response

    def cost_usd(self) -> float:
        p = self._prices
        fresh = max(0, self.input_tokens - self.cached_tokens)
        usd = (fresh * p.input + self.cached_tokens * p.cached + self.output_tokens * p.output) / 1_000_000
        return round(usd + self.unmetered * p.unmetered_call, 6)

    def summary(self) -> dict:
        """Bounded diagnostics for the response and the log: counts only, never content."""
        return {"so_lan_goi": self.calls, "token_vao": self.input_tokens, "token_cache": self.cached_tokens,
                "token_ra": self.output_tokens, "chi_phi_uoc_tinh_usd": self.cost_usd()}
