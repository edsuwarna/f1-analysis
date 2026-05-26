"""
Rate limiter for F1 Analysis API.
Uses slowapi with in-memory storage.
General: 120 req/min per IP. CSV export: 10 req/min per IP.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    storage_uri="memory://",
)
