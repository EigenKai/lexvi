"""Make the tests independent of a developer's local `.env`.

`lexvi.config` loads `.env` without overriding variables that are already set, and `lexvi.api`
reads the CORS origins at import. Pin the values the tests assume before any lexvi import.
"""
import os

os.environ["LEXVI_CORS_ORIGINS"] = "*"
