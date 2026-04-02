from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import aiohttp

logger = logging.getLogger("scraper_service.scraper")

HN_BASE = "https://hacker-news.firebaseio.com/v0"

# Map feed name → HN endpoint
FEED_ENDPOINTS: dict[str, str] = {
    "top":  f"{HN_BASE}/topstories.json",
    "new":  f"{HN_BASE}/newstories.json",
    "ask":  f"{HN_BASE}/askstories.json",
    "show": f"{HN_BASE}/showstories.json",
    "best": f"{HN_BASE}/beststories.json",
}


async def _fetch_item(session: aiohttp.ClientSession, item_id: int) -> dict | None:
    try:
        async with session.get(f"{HN_BASE}/item/{item_id}.json", timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                return None
            return await resp.json()
    except Exception:
        return None


async def scrape_subreddit(feed_name: str, limit: int = 25) -> list[dict]:
    """Fetch the latest `limit` stories from a Hacker News feed.
    feed_name: one of top | new | ask | show | best
    Returns a list of post dicts compatible with the existing DB schema.
    """
    endpoint = FEED_ENDPOINTS.get(feed_name.lower(), FEED_ENDPOINTS["top"])
    posts: list[dict] = []

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    logger.error("HN API returned %d for feed %s", resp.status, feed_name)
                    return posts
                story_ids: list[int] = await resp.json()

            # Fetch top `limit` items concurrently
            tasks = [_fetch_item(session, sid) for sid in story_ids[:limit]]
            items = await asyncio.gather(*tasks)

        for item in items:
            if not item or item.get("type") != "story":
                continue
            if item.get("dead") or item.get("deleted"):
                continue
            title = item.get("title", "").strip()
            if not title:
                continue

            body = item.get("text", "") or ""  # Ask HN posts have body text
            hn_url = f"https://news.ycombinator.com/item?id={item['id']}"
            posts.append({
                "reddit_id":    str(item["id"]),
                "subreddit":    feed_name.lower(),
                "title":        title,
                "body":         body[:4000],
                "author":       item.get("by", "[deleted]"),
                "upvote_score": item.get("score", 0),
                "url":          hn_url,   # always link to HN discussion page
                "created_utc":  datetime.fromtimestamp(item.get("time", 0), tz=timezone.utc),
            })

    except Exception:
        logger.exception("Failed to scrape HN feed: %s", feed_name)

    return posts
