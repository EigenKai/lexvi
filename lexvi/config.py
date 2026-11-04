"""Settings and the Meta Model API client (OpenAI SDK pointed at api.meta.ai).

Reads .env at the repo root once, so every entry point (API, scripts, eval) sees the
same key and model without exporting variables by hand.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "https://api.meta.ai/v1"


def _read_text(path: Path) -> str:
    """UTF-8 with or without BOM, or UTF-16 with BOM (PowerShell 5.1 '>' writes UTF-16LE)."""
    raw = path.read_bytes()
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16")
    return raw.decode("utf-8-sig")


def _parse_value(value: str) -> str:
    value = value.strip()
    if value[:1] in ("\"", "'"):
        end = value.find(value[0], 1)
        if end > 0:  # anything after the closing quote (a comment) is ignored
            return value[1:end]
    # An unquoted value ends at " #" (an inline comment).
    return value.split(" #", 1)[0].split("\t#", 1)[0].strip()


def _load_dotenv(path: Path) -> None:
    """KEY=value lines; `export `, quotes and inline comments allowed. The process env wins."""
    if not path.exists():
        return
    for line in _read_text(path).splitlines():
        line = line.strip()
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), _parse_value(value))


_load_dotenv(ROOT / ".env")

# Read after .env, so LEXVI_DATA_DIR may be set there too.
DATA_DIR = Path(os.environ.get("LEXVI_DATA_DIR") or ROOT / "data")
RUNS_DIR = ROOT / "runs"


def model() -> str:
    return os.environ.get("MODEL_API_MODEL") or "muse-spark-1.3"


def make_client() -> OpenAI:
    key = os.environ.get("MODEL_API_KEY", "")
    if not key:
        raise RuntimeError("MODEL_API_KEY is not set: copy .env.example to .env and add your key")
    return OpenAI(
        api_key=key,
        base_url=os.environ.get("MODEL_API_BASE_URL") or DEFAULT_BASE_URL,
        max_retries=4,
        timeout=180,
    )


def ask_json(
    client: OpenAI,
    prompt: str,
    schema: dict,
    name: str,
    effort: str = "low",
    max_output_tokens: int = 8000,
) -> dict:
    """One Spark call that must return JSON matching `schema` (strict structured output).

    The token cap covers reasoning plus the JSON. If the output is cut off (invalid JSON), retry
    once with double the cap before letting the JSONDecodeError reach the caller.
    """
    for cap in (max_output_tokens, max_output_tokens * 2):
        response = client.responses.create(
            model=model(),
            input=prompt,
            text={"format": {"type": "json_schema", "name": name, "schema": schema, "strict": True}},
            reasoning={"effort": effort},
            max_output_tokens=cap,
            store=False,
        )
        try:
            return json.loads(response.output_text)
        except json.JSONDecodeError:
            if cap != max_output_tokens:
                raise
    raise AssertionError("unreachable")
