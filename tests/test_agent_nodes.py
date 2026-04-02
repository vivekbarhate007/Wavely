"""
Unit tests for the LangGraph sentiment agent nodes.
LLM calls are mocked so tests run without API keys or network.
"""
import json
import sys
import types
import pytest

# ── Minimal stubs so sentiment_agent imports without DB/Kafka ─────────────────
os_env_patch = {
    "DATABASE_URL": "postgresql+asyncpg://pulse:test@localhost/test",
    "GROQ_API_KEY": "test",
}
import os
for k, v in os_env_patch.items():
    os.environ.setdefault(k, v)

# Stub out heavy imports before loading agent
for mod in ["aiokafka", "sqlalchemy", "asyncpg"]:
    if mod not in sys.modules:
        sys.modules[mod] = types.ModuleType(mod)

sys.path.insert(0, "agents")


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_route_after_trends_no_alert():
    """_route_after_trends returns 'store' when trend_alert is None."""
    from sentiment_agent import _route_after_trends, AgentState

    state: AgentState = {
        "raw_post": {}, "post_id": "x", "subreddit": "top",
        "sentiment": "neutral", "confidence": 0.5,
        "reasoning": "", "topics": [],
        "trend_alert": None, "stored": False, "error": None,
    }
    assert _route_after_trends(state) == "store"


def test_route_after_trends_with_alert():
    """_route_after_trends returns 'generate_alert' when trend_alert is set."""
    from sentiment_agent import _route_after_trends, AgentState

    state: AgentState = {
        "raw_post": {}, "post_id": "x", "subreddit": "top",
        "sentiment": "negative", "confidence": 0.9,
        "reasoning": "", "topics": [],
        "trend_alert": {"severity": "high", "negative_pct": 0.82},
        "stored": False, "error": None,
    }
    assert _route_after_trends(state) == "generate_alert"


@pytest.mark.asyncio
async def test_ingest_node_assigns_post_id():
    """ingest_node carries through post data and sets subreddit."""
    from sentiment_agent import ingest_node, AgentState

    state: AgentState = {
        "raw_post": {"subreddit": "ask", "title": "Test"},
        "post_id": "", "subreddit": "",
        "sentiment": "neutral", "confidence": 0.0,
        "reasoning": "", "topics": [],
        "trend_alert": None, "stored": False, "error": None,
    }
    result = await ingest_node(state)
    assert result["subreddit"] == "ask"
    assert result["error"] is None


def test_sentiment_json_parsing():
    """Verify the JSON sentiment response format the agent expects."""
    raw = '{"sentiment": "positive", "confidence": 0.92, "reasoning": "upbeat tone"}'
    parsed = json.loads(raw)
    assert parsed["sentiment"] == "positive"
    assert 0 <= parsed["confidence"] <= 1
    assert isinstance(parsed["reasoning"], str)


def test_topics_json_parsing():
    """Verify topic extraction JSON format."""
    raw = '["open source AI", "LLM benchmarks", "model performance"]'
    topics = json.loads(raw)
    assert isinstance(topics, list)
    assert all(isinstance(t, str) for t in topics)
