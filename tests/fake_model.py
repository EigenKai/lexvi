"""A scripted stand-in for the Meta Model API client, for offline tests only.

Each scripted turn is a tool call (name, args), a list of output items (several tool calls in
one response), a JSON object for structured output, or an exception instance to raise.
"""

from __future__ import annotations

import json
from types import SimpleNamespace


def call(name: str, **args) -> SimpleNamespace:
    return SimpleNamespace(type="function_call", name=name, arguments=json.dumps(args, ensure_ascii=False),
                           call_id=f"c-{name}")


def raw_call(name: str, arguments: str, call_id: str | None = None) -> SimpleNamespace:
    """A function call with raw (possibly malformed) argument text."""
    return SimpleNamespace(type="function_call", name=name, arguments=arguments, call_id=call_id or f"c-{name}")


class FakeClient:
    def __init__(self, turns: list):
        self.turns = list(turns)
        self.requests: list = []
        self.responses = self

    def create(self, **kwargs):
        snapshot = dict(kwargs)
        if isinstance(kwargs.get("input"), list):  # the agent keeps appending to the same list
            snapshot["input"] = list(kwargs["input"])
        self.requests.append(snapshot)
        if not self.turns:
            raise AssertionError("fake model ran out of scripted turns")
        turn = self.turns.pop(0)
        if isinstance(turn, BaseException):
            raise turn
        if isinstance(turn, dict):  # structured output
            return SimpleNamespace(output=[], output_text=json.dumps(turn, ensure_ascii=False))
        return SimpleNamespace(output=turn if isinstance(turn, list) else [turn], output_text="")
