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
DATA_DIR = Path(os.environ.get("LEXVI_DATA_DIR") or ROOT / "data")
RUNS_DIR = ROOT / "runs"
DEFAULT_BASE_URL = "https://api.meta.ai/v1"


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv(ROOT / ".env")


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


def ask_json(client: OpenAI, prompt: str, schema: dict, name: str, effort: str = "low") -> dict:
    """One Spark call that must return JSON matching `schema` (strict structured output)."""
    response = client.responses.create(
        model=model(),
        input=prompt,
        text={"format": {"type": "json_schema", "name": name, "schema": schema, "strict": True}},
        reasoning={"effort": effort},
        max_output_tokens=8000,
        store=False,
    )
    return json.loads(response.output_text)
