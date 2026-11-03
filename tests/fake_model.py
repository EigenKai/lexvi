"""A scripted stand-in for the Meta Model API client, for offline tests only.

Each scripted turn is a tool call (name, args) or a JSON object for structured output.
"""

from __future__ import annotations

import json
from types import SimpleNamespace


def call(name: str, **args) -> SimpleNamespace:
    return SimpleNamespace(type="function_call", name=name, arguments=json.dumps(args, ensure_ascii=False),
                           call_id=f"c-{name}")


class FakeClient:
    def __init__(self, turns: list):
        self.turns = list(turns)
        self.requests: list = []
        self.responses = self

    def create(self, **kwargs):
        self.requests.append(kwargs)
        turn = self.turns.pop(0)
        if isinstance(turn, dict):  # structured output
            return SimpleNamespace(output=[], output_text=json.dumps(turn, ensure_ascii=False))
        return SimpleNamespace(output=[turn], output_text="")
