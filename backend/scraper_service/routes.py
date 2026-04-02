from __future__ import annotations

import logging
import os

from aiokafka import AIOKafkaProducer
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from kafka_producer import TOPIC_RAW_POSTS, get_producer, publish
from models import Post, WatchedSubreddit
from schemas import ScrapeResult, SubredditIn, SubredditOut
from scraper import scrape_subreddit

logger = logging.getLogger("scraper_service.routes")

POSTS_PER_SUBREDDIT = int(os.environ.get("POSTS_PER_SUBREDDIT", "25"))

router = APIRouter()


@router.get("/subreddits", response_model=list[SubredditOut])
async def list_subreddits(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WatchedSubreddit).where(WatchedSubreddit.active == True))
    return result.scalars().all()


@router.post("/subreddits", response_model=SubredditOut, status_code=201)
async def add_subreddit(body: SubredditIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(WatchedSubreddit).where(WatchedSubreddit.name == body.name.lower())
    )
    row = existing.scalar_one_or_none()
    if row:
        row.active = True
    else:
        row = WatchedSubreddit(name=body.name.lower())
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/subreddits/{name}", status_code=204)
async def remove_subreddit(name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WatchedSubreddit).where(WatchedSubreddit.name == name.lower())
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Subreddit not found")
    row.active = False
    await db.commit()


@router.post("/scrape/trigger", response_model=list[ScrapeResult])
async def trigger_scrape(
    db: AsyncSession = Depends(get_db),
    producer: AIOKafkaProducer = Depends(get_producer),
):
    """Manually trigger a scrape of all active subreddits."""
    result = await db.execute(select(WatchedSubreddit).where(WatchedSubreddit.active == True))
    subreddits = result.scalars().all()

    results: list[ScrapeResult] = []
    for sub in subreddits:
        posts = await scrape_subreddit(sub.name, limit=POSTS_PER_SUBREDDIT)
        new_count = 0
        for post_data in posts:
            # Skip already-seen reddit_ids
            exists = await db.execute(
                select(Post.id).where(Post.reddit_id == post_data["reddit_id"])
            )
            if exists.scalar_one_or_none():
                continue

            # Persist to DB
            db_post = Post(
                reddit_id=post_data["reddit_id"],
                subreddit=post_data["subreddit"],
                title=post_data["title"],
                body=post_data["body"],
                author=post_data["author"],
                upvote_score=post_data["upvote_score"],
                url=post_data["url"],
                created_utc=post_data["created_utc"],
            )
            db.add(db_post)
            await db.flush()

            # Publish to Kafka
            await publish(producer, TOPIC_RAW_POSTS, {
                **post_data,
                "db_post_id": str(db_post.id),
            })
            new_count += 1

        await db.commit()
        results.append(ScrapeResult(
            subreddit=sub.name,
            fetched=len(posts),
            new_posts=new_count,
        ))
        logger.info("r/%s: fetched=%d new=%d", sub.name, len(posts), new_count)

    return results
