from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from aiokafka import AIOKafkaProducer
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import AsyncSessionLocal, engine
from kafka_producer import TOPIC_RAW_POSTS, publish
from models import Base, Post, WatchedSubreddit
from routes import router
from scraper import scrape_subreddit

KAFKA_BOOTSTRAP  = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
SCRAPE_INTERVAL  = int(os.environ.get("SCRAPE_INTERVAL_SECONDS", "300"))
POSTS_PER_SUB    = int(os.environ.get("POSTS_PER_SUBREDDIT", "25"))

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("scraper_service")


async def _run_scheduled_scrape(producer: AIOKafkaProducer) -> None:
    logger.info("Scheduled scrape started")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(WatchedSubreddit).where(WatchedSubreddit.active == True)
        )
        subreddits = result.scalars().all()
        for sub in subreddits:
            posts = await scrape_subreddit(sub.name, limit=POSTS_PER_SUB)
            new_count = 0
            for post_data in posts:
                exists = await db.execute(
                    select(Post.id).where(Post.reddit_id == post_data["reddit_id"])
                )
                if exists.scalar_one_or_none():
                    continue
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
                await publish(producer, TOPIC_RAW_POSTS, {
                    **post_data,
                    "db_post_id": str(db_post.id),
                })
                new_count += 1
            await db.commit()
            logger.info("r/%s: fetched=%d new=%d", sub.name, len(posts), new_count)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
    await producer.start()
    app.state.kafka = producer

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _run_scheduled_scrape,
        "interval",
        seconds=SCRAPE_INTERVAL,
        args=[producer],
        id="scrape_job",
    )
    scheduler.start()

    logger.info("Scraper service started. Interval=%ds", SCRAPE_INTERVAL)
    yield

    scheduler.shutdown(wait=False)
    await producer.stop()
    logger.info("Scraper service stopped.")


app = FastAPI(title="Wavely Scraper Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scraper"}
