from __future__ import annotations

import logging
import subprocess
import sys
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db

logger = logging.getLogger("sentiment_service.routes")
router = APIRouter()


@router.get("/posts")
async def get_posts(
    subreddit: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Paginated posts with their sentiment scores."""
    filters = []
    params: dict = {"limit": limit, "offset": offset}

    if subreddit:
        filters.append("p.subreddit = :subreddit")
        params["subreddit"] = subreddit
    if sentiment:
        filters.append("ps.sentiment = :sentiment")
        params["sentiment"] = sentiment

    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    result = await db.execute(text(f"""
        SELECT
            p.id, p.reddit_id, p.subreddit, p.title, p.author,
            p.upvote_score, p.url, p.created_utc, p.fetched_at,
            ps.sentiment, ps.confidence, ps.reasoning, ps.topics, ps.processed_at
        FROM sentiment.posts p
        LEFT JOIN sentiment.post_sentiments ps ON ps.post_id = p.id
        {where}
        ORDER BY p.fetched_at DESC
        LIMIT :limit OFFSET :offset
    """), params)

    rows = result.fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/topics")
async def get_topics(
    subreddit: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Topic frequency and sentiment breakdown."""
    params: dict = {"hours": hours}
    sub_filter = ""
    if subreddit:
        sub_filter = "AND p.subreddit = :subreddit"
        params["subreddit"] = subreddit

    result = await db.execute(text(f"""
        SELECT
            topic,
            COUNT(*) AS total,
            SUM(CASE WHEN ps.sentiment = 'positive'  THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN ps.sentiment = 'negative'  THEN 1 ELSE 0 END) AS negative,
            SUM(CASE WHEN ps.sentiment = 'neutral'   THEN 1 ELSE 0 END) AS neutral
        FROM sentiment.post_sentiments ps
        JOIN sentiment.posts p ON p.id = ps.post_id,
        jsonb_array_elements_text(ps.topics) AS topic
        WHERE ps.processed_at >= NOW() - INTERVAL '1 hour' * :hours
        {sub_filter}
        GROUP BY topic
        ORDER BY total DESC
        LIMIT 20
    """), params)

    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/trends")
async def get_trends(
    subreddit: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Hourly sentiment counts for time-series chart."""
    params: dict = {"hours": hours}
    sub_filter = ""
    if subreddit:
        sub_filter = "AND p.subreddit = :subreddit"
        params["subreddit"] = subreddit

    result = await db.execute(text(f"""
        SELECT
            DATE_TRUNC('hour', ps.processed_at) AS hour,
            ps.sentiment,
            COUNT(*) AS count
        FROM sentiment.post_sentiments ps
        JOIN sentiment.posts p ON p.id = ps.post_id
        WHERE ps.processed_at >= NOW() - INTERVAL '1 hour' * :hours
        {sub_filter}
        GROUP BY hour, ps.sentiment
        ORDER BY hour ASC
    """), params)

    rows = result.fetchall()
    # Pivot into [{hour, positive, negative, neutral}]
    buckets: dict = {}
    for row in rows:
        h = row.hour.isoformat()
        if h not in buckets:
            buckets[h] = {"hour": h, "positive": 0, "negative": 0, "neutral": 0}
        buckets[h][row.sentiment] = row.count

    return list(buckets.values())


@router.get("/alerts")
async def get_alerts(
    subreddit: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Trend alerts list."""
    filters = []
    params: dict = {"limit": limit}

    if subreddit:
        filters.append("subreddit = :subreddit")
        params["subreddit"] = subreddit
    if severity:
        filters.append("severity = :severity")
        params["severity"] = severity

    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    result = await db.execute(text(f"""
        SELECT id, subreddit, alert_type, summary, severity,
               window_minutes, post_count, negative_pct, detected_at
        FROM sentiment.trend_alerts
        {where}
        ORDER BY detected_at DESC
        LIMIT :limit
    """), params)

    return [dict(r._mapping) for r in result.fetchall()]


@router.get("/digest/latest")
async def get_latest_digest(db: AsyncSession = Depends(get_db)):
    """Fetch the most recent weekly digest."""
    result = await db.execute(text("""
        SELECT id, week_start, week_end, subreddits, summary,
               top_topics, sentiment_breakdown, created_at
        FROM sentiment.weekly_digests
        ORDER BY created_at DESC
        LIMIT 1
    """))
    row = result.fetchone()
    if not row:
        return {"detail": "No digest available yet"}
    return dict(row._mapping)


@router.post("/digest/generate")
async def trigger_digest(
    subreddits: Optional[list[str]] = None,
):
    """Trigger weekly digest generation (runs agent coroutine inline)."""
    import asyncio
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "agents"))
    try:
        from sentiment_agent import generate_weekly_digest
        result = await generate_weekly_digest(subreddits)
        return result
    except Exception as e:
        logger.exception("Digest generation failed")
        return {"error": str(e)}


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """KPI stats for the overview page."""
    result = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM sentiment.posts) AS total_posts,
            (SELECT COUNT(*) FROM sentiment.post_sentiments) AS analyzed_posts,
            (SELECT COUNT(*) FROM sentiment.trend_alerts WHERE detected_at >= NOW() - INTERVAL '24 hours') AS alerts_24h,
            (SELECT COUNT(DISTINCT subreddit) FROM sentiment.posts) AS subreddits_tracked,
            (SELECT sentiment FROM sentiment.post_sentiments
             GROUP BY sentiment ORDER BY COUNT(*) DESC LIMIT 1) AS top_sentiment
    """))
    row = result.fetchone()
    return dict(row._mapping) if row else {}
