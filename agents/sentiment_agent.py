"""
Wavely — Sentiment Agent
==================================
A LangGraph-based autonomous agent that:
  1. Consumes raw Reddit posts from Kafka topic `sentiment.raw.posts`
  2. Analyzes sentiment (positive / negative / neutral) via Groq
  3. Extracts key topics from each post
  4. Detects negative sentiment spikes and generates trend alerts
  5. Persists all results to Postgres with full audit trail

Graph topology:
    ingest → analyze_sentiment → extract_topics → detect_trends
                                                        │
                                        _route_after_trends()
                                       /                    \\
                               [alert=True]            [alert=False]
                           generate_alert_node        store_node → END
                                   │
                              store_node → END

Run:
    DATABASE_URL=postgresql+asyncpg://... \\
    KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \\
    GROQ_API_KEY=gsk_... \\
        python -m agents.sentiment_agent
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import Float, String, Text, func, select
from sqlalchemy import Column, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from typing_extensions import TypedDict

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL       = os.environ["DATABASE_URL"]
KAFKA_BOOTSTRAP    = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
GROQ_MODEL         = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
TOPIC_RAW_POSTS    = "sentiment.raw.posts"
TOPIC_PROCESSED    = "sentiment.processed"
TREND_WINDOW_MIN   = int(os.environ.get("TREND_WINDOW_MINUTES", "30"))
TREND_MIN_POSTS    = int(os.environ.get("TREND_MIN_POSTS", "10"))
TREND_NEG_THRESHOLD = float(os.environ.get("TREND_NEG_THRESHOLD", "0.60"))

# Groq free tier: 30 RPM — allow max 3 concurrent LLM-heavy graph invocations
_llm_semaphore = asyncio.Semaphore(3)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("sentiment_agent")

# ── Database ──────────────────────────────────────────────────────────────────
_engine  = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
_Session = async_sessionmaker(_engine, expire_on_commit=False)


class _Base(DeclarativeBase):
    pass


class _PostSentiment(_Base):
    __tablename__ = "post_sentiments"
    __table_args__ = {"schema": "sentiment"}

    id           = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id      = Column(PG_UUID(as_uuid=True), nullable=False)
    sentiment    = Column(String(16),  nullable=False)
    confidence   = Column(Float,       nullable=False, default=0.0)
    reasoning    = Column(Text,        nullable=False, default="")
    topics       = Column(JSONB,       nullable=False, default=list)
    processed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class _TrendAlert(_Base):
    __tablename__ = "trend_alerts"
    __table_args__ = {"schema": "sentiment"}

    id             = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subreddit      = Column(String(128), nullable=False)
    alert_type     = Column(String(64),  nullable=False, default="negative_spike")
    summary        = Column(Text,        nullable=False, default="")
    severity       = Column(String(16),  nullable=False)
    window_minutes = Column(Integer,     nullable=False, default=30)
    post_count     = Column(Integer,     nullable=False, default=0)
    negative_pct   = Column(Float,       nullable=False, default=0.0)
    detected_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class _WeeklyDigest(_Base):
    __tablename__ = "weekly_digests"
    __table_args__ = {"schema": "sentiment"}

    id                  = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_start          = Column(DateTime(timezone=True), nullable=False)
    week_end            = Column(DateTime(timezone=True), nullable=False)
    subreddits          = Column(JSONB, nullable=False, default=list)
    summary             = Column(Text,  nullable=False, default="")
    top_topics          = Column(JSONB, nullable=False, default=list)
    sentiment_breakdown = Column(JSONB, nullable=False, default=dict)
    created_at          = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ── Agent State ───────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    raw_post:    dict
    post_id:     str
    subreddit:   str
    sentiment:   str
    confidence:  float
    reasoning:   str
    topics:      list[str]
    trend_alert: Optional[dict]
    stored:      bool
    error:       Optional[str]


# ── LLM ───────────────────────────────────────────────────────────────────────
def _get_llm():
    from langchain_groq import ChatGroq
    return ChatGroq(model=GROQ_MODEL, temperature=0.2)


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def ingest_node(state: AgentState) -> AgentState:
    """Validate and extract post identifiers from the Kafka message."""
    post = state["raw_post"]
    post_id = post.get("db_post_id") or str(uuid.uuid4())
    return {
        **state,
        "post_id":   post_id,
        "subreddit": post.get("subreddit", "unknown"),
        "error":     None,
    }


async def analyze_sentiment_node(state: AgentState) -> AgentState:
    """Use Groq to classify sentiment of the post."""
    post  = state["raw_post"]
    title = post.get("title", "")
    body  = post.get("body", "")
    text  = f"Title: {title}\n\nBody: {body[:2000]}" if body else f"Title: {title}"

    system = (
        "You are a sentiment analysis expert. Analyze the Reddit post and respond "
        "with ONLY a valid JSON object — no markdown, no explanation — in this exact format:\n"
        '{"sentiment": "positive"|"negative"|"neutral", "confidence": 0.0-1.0, '
        '"reasoning": "one sentence explanation"}'
    )

    try:
        llm      = _get_llm()
        response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=text)])
        raw      = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return {
            **state,
            "sentiment":  parsed.get("sentiment", "neutral"),
            "confidence": float(parsed.get("confidence", 0.5)),
            "reasoning":  parsed.get("reasoning", ""),
        }
    except Exception:
        logger.exception("analyze_sentiment_node failed for post %s", state["post_id"])
        return {**state, "sentiment": "neutral", "confidence": 0.0, "reasoning": "", "error": "sentiment_failed"}


async def extract_topics_node(state: AgentState) -> AgentState:
    """Use Groq to extract 3-5 key topics from the post."""
    post  = state["raw_post"]
    title = post.get("title", "")
    body  = post.get("body", "")
    text  = f"Title: {title}\n\nBody: {body[:2000]}" if body else f"Title: {title}"

    system = (
        "Extract 3 to 5 key topics or themes from this Reddit post. "
        "Respond with ONLY a valid JSON array of short topic strings (2-4 words each). "
        'Example: ["API performance", "rate limiting", "error handling"]'
    )

    try:
        llm      = _get_llm()
        response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=text)])
        raw      = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        topics = json.loads(raw)
        if not isinstance(topics, list):
            topics = []
        return {**state, "topics": topics[:5]}
    except Exception:
        logger.exception("extract_topics_node failed for post %s", state["post_id"])
        return {**state, "topics": []}


async def detect_trends_node(state: AgentState) -> AgentState:
    """Query Postgres: if ≥TREND_MIN_POSTS in last TREND_WINDOW_MIN with negative_pct > threshold → alert."""
    subreddit  = state["subreddit"]
    since      = datetime.now(tz=timezone.utc) - timedelta(minutes=TREND_WINDOW_MIN)

    try:
        async with _Session() as db:
            # Count total and negative posts in window
            from sqlalchemy import text as sa_text
            result = await db.execute(sa_text("""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN ps.sentiment = 'negative' THEN 1 ELSE 0 END) AS neg_count
                FROM sentiment.post_sentiments ps
                JOIN sentiment.posts p ON p.id = ps.post_id
                WHERE p.subreddit = :subreddit
                  AND ps.processed_at >= :since
            """), {"subreddit": subreddit, "since": since})
            row = result.fetchone()
            total     = row.total     or 0
            neg_count = row.neg_count or 0

        if total < TREND_MIN_POSTS:
            return {**state, "trend_alert": None}

        neg_pct = neg_count / total
        if neg_pct < TREND_NEG_THRESHOLD:
            return {**state, "trend_alert": None}

        severity = "high" if neg_pct > 0.80 else ("medium" if neg_pct > 0.70 else "low")
        return {
            **state,
            "trend_alert": {
                "subreddit":      subreddit,
                "alert_type":     "negative_spike",
                "severity":       severity,
                "window_minutes": TREND_WINDOW_MIN,
                "post_count":     total,
                "negative_pct":   round(neg_pct, 4),
            },
        }
    except Exception:
        logger.exception("detect_trends_node failed for subreddit %s", subreddit)
        return {**state, "trend_alert": None}


async def generate_alert_node(state: AgentState) -> AgentState:
    """Use Groq to write a natural-language summary of the trend alert, then save it."""
    alert    = state["trend_alert"]
    subreddit = state["subreddit"]

    system = (
        "You are a social media analyst. Write a concise 2-3 sentence summary "
        "describing a negative sentiment spike on a Reddit community. "
        "Be factual and professional."
    )
    prompt = (
        f"Subreddit: r/{subreddit}\n"
        f"Time window: last {alert['window_minutes']} minutes\n"
        f"Posts analyzed: {alert['post_count']}\n"
        f"Negative sentiment: {alert['negative_pct']*100:.1f}%\n"
        f"Severity: {alert['severity']}\n\n"
        "Write a brief summary of this trend."
    )

    try:
        llm      = _get_llm()
        response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=prompt)])
        summary  = response.content.strip()
    except Exception:
        logger.exception("generate_alert_node LLM call failed")
        summary = f"Negative sentiment spike detected in r/{subreddit}: {alert['negative_pct']*100:.1f}% of recent posts."

    try:
        async with _Session() as db:
            db_alert = _TrendAlert(
                subreddit=subreddit,
                alert_type=alert["alert_type"],
                summary=summary,
                severity=alert["severity"],
                window_minutes=alert["window_minutes"],
                post_count=alert["post_count"],
                negative_pct=alert["negative_pct"],
            )
            db.add(db_alert)
            await db.commit()
            logger.info("Trend alert saved for r/%s (severity=%s)", subreddit, alert["severity"])
    except Exception:
        logger.exception("Failed to save trend alert for r/%s", subreddit)

    return {**state, "trend_alert": {**alert, "summary": summary}}


async def store_node(state: AgentState) -> AgentState:
    """Persist the post sentiment to Postgres and publish real-time event."""
    try:
        async with _Session() as db:
            row = _PostSentiment(
                post_id=uuid.UUID(state["post_id"]),
                sentiment=state["sentiment"],
                confidence=state["confidence"],
                reasoning=state["reasoning"],
                topics=state["topics"],
            )
            db.add(row)
            await db.commit()
            logger.info(
                "Stored sentiment for post %s: %s (%.2f)",
                state["post_id"], state["sentiment"], state["confidence"],
            )

        # Publish lightweight event for real-time WebSocket broadcast
        try:
            from aiokafka import AIOKafkaProducer
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP)
            await producer.start()
            event = {
                "post_id":   state["post_id"],
                "subreddit": state["subreddit"],
                "title":     state["raw_post"].get("title", ""),
                "author":    state["raw_post"].get("author", ""),
                "url":       state["raw_post"].get("url", ""),
                "upvote_score": state["raw_post"].get("upvote_score", 0),
                "sentiment":  state["sentiment"],
                "confidence": state["confidence"],
                "reasoning":  state["reasoning"],
                "topics":     state["topics"],
            }
            await producer.send_and_wait(
                TOPIC_PROCESSED,
                json.dumps(event).encode("utf-8"),
            )
            await producer.stop()
        except Exception:
            logger.warning("Could not publish to %s (non-fatal)", TOPIC_PROCESSED)

        return {**state, "stored": True}
    except Exception:
        logger.exception("store_node failed for post %s", state["post_id"])
        return {**state, "stored": False, "error": "store_failed"}


# ── Routing ───────────────────────────────────────────────────────────────────

def _route_after_trends(state: AgentState) -> str:
    if state.get("trend_alert"):
        return "generate_alert"
    return "store"


# ── Graph ─────────────────────────────────────────────────────────────────────

def _build_graph() -> Any:
    g = StateGraph(AgentState)
    g.add_node("ingest",           ingest_node)
    g.add_node("analyze_sentiment", analyze_sentiment_node)
    g.add_node("extract_topics",   extract_topics_node)
    g.add_node("detect_trends",    detect_trends_node)
    g.add_node("generate_alert",   generate_alert_node)
    g.add_node("store",            store_node)

    g.set_entry_point("ingest")
    g.add_edge("ingest",            "analyze_sentiment")
    g.add_edge("analyze_sentiment", "extract_topics")
    g.add_edge("extract_topics",    "detect_trends")
    g.add_conditional_edges("detect_trends", _route_after_trends, {
        "generate_alert": "generate_alert",
        "store":          "store",
    })
    g.add_edge("generate_alert", "store")
    g.add_edge("store",          END)

    return g.compile()


# ── Weekly Digest ──────────────────────────────────────────────────────────────

async def generate_weekly_digest(subreddits: list[str] | None = None) -> dict:
    """Generate a weekly digest from the last 7 days of data."""
    now        = datetime.now(tz=timezone.utc)
    week_start = now - timedelta(days=7)

    from sqlalchemy import text as sa_text
    async with _Session() as db:
        # Sentiment breakdown
        result = await db.execute(sa_text("""
            SELECT ps.sentiment, COUNT(*) as cnt
            FROM sentiment.post_sentiments ps
            JOIN sentiment.posts p ON p.id = ps.post_id
            WHERE ps.processed_at >= :week_start
              AND (:subs IS NULL OR p.subreddit = ANY(:subs))
            GROUP BY ps.sentiment
        """), {"week_start": week_start, "subs": subreddits})
        breakdown = {row.sentiment: row.cnt for row in result.fetchall()}

        # Top topics
        result = await db.execute(sa_text("""
            SELECT topic, COUNT(*) as cnt
            FROM sentiment.post_sentiments ps
            JOIN sentiment.posts p ON p.id = ps.post_id,
            jsonb_array_elements_text(ps.topics) AS topic
            WHERE ps.processed_at >= :week_start
              AND (:subs IS NULL OR p.subreddit = ANY(:subs))
            GROUP BY topic
            ORDER BY cnt DESC
            LIMIT 10
        """), {"week_start": week_start, "subs": subreddits})
        top_topics = [{"topic": row.topic, "count": row.cnt} for row in result.fetchall()]

    # LLM summary
    system = (
        "You are a data analyst summarizing a week of Reddit sentiment data. "
        "Write a clear, professional 3-4 sentence markdown summary."
    )
    total = sum(breakdown.values())
    neg_pct = round(breakdown.get("negative", 0) / max(total, 1) * 100, 1)
    pos_pct = round(breakdown.get("positive", 0) / max(total, 1) * 100, 1)
    topics_str = ", ".join(t["topic"] for t in top_topics[:5])

    prompt = (
        f"Week: {week_start.date()} to {now.date()}\n"
        f"Total posts analyzed: {total}\n"
        f"Positive: {pos_pct}%, Negative: {neg_pct}%, Neutral: {round(100-pos_pct-neg_pct,1)}%\n"
        f"Top topics: {topics_str}\n"
        f"Subreddits: {', '.join(subreddits) if subreddits else 'all'}\n\n"
        "Write the weekly sentiment digest summary."
    )

    try:
        llm      = _get_llm()
        response = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=prompt)])
        summary  = response.content.strip()
    except Exception:
        logger.exception("Weekly digest LLM call failed")
        summary = f"Weekly digest: {total} posts analyzed. Positive: {pos_pct}%, Negative: {neg_pct}%."

    async with _Session() as db:
        digest = _WeeklyDigest(
            week_start=week_start,
            week_end=now,
            subreddits=subreddits or [],
            summary=summary,
            top_topics=top_topics,
            sentiment_breakdown=breakdown,
        )
        db.add(digest)
        await db.commit()
        await db.refresh(digest)
        logger.info("Weekly digest generated: id=%s", digest.id)
        return {
            "id":                 str(digest.id),
            "week_start":         week_start.isoformat(),
            "week_end":           now.isoformat(),
            "summary":            summary,
            "top_topics":         top_topics,
            "sentiment_breakdown": breakdown,
        }


# ── Kafka Consumer ─────────────────────────────────────────────────────────────

class SentimentAgent:
    def __init__(self):
        self.graph = _build_graph()

    async def _process(self, post_data: dict) -> None:
        initial_state: AgentState = {
            "raw_post":    post_data,
            "post_id":     post_data.get("db_post_id", str(uuid.uuid4())),
            "subreddit":   post_data.get("subreddit", "unknown"),
            "sentiment":   "neutral",
            "confidence":  0.0,
            "reasoning":   "",
            "topics":      [],
            "trend_alert": None,
            "stored":      False,
            "error":       None,
        }
        async with _llm_semaphore:
            try:
                await self.graph.ainvoke(initial_state)
                await asyncio.sleep(2)  # respect 30 RPM limit: 2 LLM calls per post = ~10s/3 concurrent
            except Exception:
                logger.exception("Graph invocation failed for post %s", post_data.get("reddit_id"))

    async def run(self) -> None:
        logger.info("Sentiment agent starting, consuming from %s", TOPIC_RAW_POSTS)
        consumer = AIOKafkaConsumer(
            TOPIC_RAW_POSTS,
            bootstrap_servers=KAFKA_BOOTSTRAP,
            group_id="sentiment-agent",
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        await consumer.start()
        try:
            async for msg in consumer:
                try:
                    data = json.loads(msg.value.decode("utf-8"))
                    asyncio.create_task(self._process(data))
                except Exception:
                    logger.exception("Failed to parse Kafka message")
        finally:
            await consumer.stop()
            logger.info("Sentiment agent stopped.")


if __name__ == "__main__":
    asyncio.run(SentimentAgent().run())
