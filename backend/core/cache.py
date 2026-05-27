"""
Simple file-based cache for analytics endpoints.

Telemetry analysis is expensive (millions of rows) but data is static
once a race weekend ends. Cache results per session_id indefinitely.
"""

import json
import os
import hashlib

CACHE_DIR = os.getenv("CACHE_DIR", "/tmp/f1-cache")
ANALYTICS_CACHE_DIR = os.path.join(CACHE_DIR, "analytics")


def _cache_key(endpoint: str, session_id: int) -> str:
    raw = f"{endpoint}:{session_id}"
    h = hashlib.md5(raw.encode()).hexdigest()
    return os.path.join(ANALYTICS_CACHE_DIR, f"{h}.json")


def get_cached(endpoint: str, session_id: int):
    """Return cached result or None."""
    path = _cache_key(endpoint, session_id)
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def set_cache(endpoint: str, session_id: int, data):
    """Cache result to disk."""
    os.makedirs(ANALYTICS_CACHE_DIR, exist_ok=True)
    path = _cache_key(endpoint, session_id)
    with open(path, "w") as f:
        json.dump(data, f)
