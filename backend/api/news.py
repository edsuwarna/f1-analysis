"""
F1 News — RSS feed aggregation with in-memory caching.
Fetches from multiple F1 news sources using stdlib only (urllib).
Caches for 15 minutes.
"""

import asyncio
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from typing import Optional
from fastapi import APIRouter

router = APIRouter()

# ── RSS Sources ──
SOURCES = [
    {"name": "Motorsport", "url": "https://www.motorsport.com/rss/f1/news/", "icon": "⚡"},
    {"name": "The Guardian", "url": "https://www.theguardian.com/sport/formulaone/rss", "icon": "📰"},
    {"name": "RaceFans", "url": "https://www.racefans.net/feed/", "icon": "🏁"},
    {"name": "F1i", "url": "https://f1i.com/feed", "icon": "🌍"},
]

CACHE_TTL = 900  # 15 minutes
_cache = {"data": None, "ts": 0, "errors": []}


def _fetch_feed_sync(source: dict) -> list:
    """Fetch and parse a single RSS feed (synchronous, thread-pooled)."""
    items = []
    try:
        req = urllib.request.Request(
            source["url"],
            headers={"User-Agent": "F1Analysis/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()

        root = ET.fromstring(content)
        channel = root.find("channel")
        if channel is not None:
            entries = channel.findall("item")
        else:
            # Try Atom
            entries = root.findall("{http://www.w3.org/2005/Atom}entry")

        for item in entries:
            if channel is not None:
                # RSS 2.0
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc_raw = item.findtext("description", "") or ""
                pub_date = item.findtext("pubDate", "") or ""
                thumb = ""
                # Try media:thumbnail
                ns = {"media": "http://search.yahoo.com/mrss/"}
                media = item.find("media:thumbnail", ns)
                if media is not None:
                    thumb = media.get("url", "")
                if not thumb:
                    media_content = item.find("media:content", ns)
                    if media_content is not None and media_content.get("type", "").startswith("image"):
                        thumb = media_content.get("url", "")
            else:
                # Atom
                title_el = item.find("{http://www.w3.org/2005/Atom}title")
                title = title_el.text.strip() if title_el is not None and title_el.text else ""
                link_el = item.find("{http://www.w3.org/2005/Atom}link")
                link = link_el.get("href", "") if link_el is not None else ""
                desc_el = item.find("{http://www.w3.org/2005/Atom}summary")
                desc_raw = desc_el.text.strip() if desc_el is not None and desc_el.text else ""
                pub_date = item.findtext("{http://www.w3.org/2005/Atom}updated", "")
                thumb = ""

            if not title:
                continue

            desc = re.sub(r"<[^>]+>", "", desc_raw).strip()[:300] if desc_raw else ""

            items.append({
                "title": title,
                "link": link,
                "description": desc,
                "pub_date": pub_date,
                "thumbnail": thumb,
                "source": source["name"],
                "source_icon": source["icon"],
            })
    except Exception as e:
        raise

    return items


async def fetch_all() -> list:
    """Fetch from all sources concurrently using thread pool."""
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, _fetch_feed_sync, s) for s in SOURCES]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    merged = []
    _errors = []
    for source, result in zip(SOURCES, results):
        if isinstance(result, Exception):
            _errors.append(f"{source['name']}: {result}")
        else:
            merged.extend(result)

    merged.sort(key=lambda x: x.get("pub_date", ""), reverse=True)
    return merged


@router.get("/news")
async def get_news(refresh: bool = False):
    """Get latest F1 news from RSS feeds. Cached for 15 minutes.
    Use ?refresh=true to force refresh."""
    global _cache
    now = time.time()

    if not refresh and _cache["data"] and (now - _cache["ts"] < CACHE_TTL):
        return {
            "articles": _cache["data"],
            "cached": True,
            "age_seconds": int(now - _cache["ts"]),
        }

    articles = await fetch_all()
    _cache = {"data": articles, "ts": now, "errors": []}

    return {
        "articles": articles,
        "cached": False,
        "age_seconds": 0,
    }
