-- Wavely — Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS sentiment;

-- ── Posts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment.posts (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    reddit_id     VARCHAR(32)  NOT NULL UNIQUE,
    subreddit     VARCHAR(128) NOT NULL,
    title         TEXT         NOT NULL,
    body          TEXT         NOT NULL DEFAULT '',
    author        VARCHAR(128) NOT NULL DEFAULT '[deleted]',
    upvote_score  INT          NOT NULL DEFAULT 0,
    url           TEXT         NOT NULL,
    created_utc   TIMESTAMPTZ  NOT NULL,
    fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_subreddit    ON sentiment.posts (subreddit);
CREATE INDEX IF NOT EXISTS idx_posts_fetched_at   ON sentiment.posts (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_utc  ON sentiment.posts (created_utc DESC);

-- ── Post Sentiments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment.post_sentiments (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id      UUID        NOT NULL REFERENCES sentiment.posts(id) ON DELETE CASCADE,
    sentiment    VARCHAR(16) NOT NULL CHECK (sentiment IN ('positive','negative','neutral')),
    confidence   FLOAT       NOT NULL DEFAULT 0.0,
    reasoning    TEXT        NOT NULL DEFAULT '',
    topics       JSONB       NOT NULL DEFAULT '[]',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiments_post_id      ON sentiment.post_sentiments (post_id);
CREATE INDEX IF NOT EXISTS idx_sentiments_sentiment    ON sentiment.post_sentiments (sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiments_processed_at ON sentiment.post_sentiments (processed_at DESC);

-- ── Trend Alerts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment.trend_alerts (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    subreddit      VARCHAR(128) NOT NULL,
    alert_type     VARCHAR(64)  NOT NULL DEFAULT 'negative_spike',
    summary        TEXT         NOT NULL DEFAULT '',
    severity       VARCHAR(16)  NOT NULL CHECK (severity IN ('low','medium','high')),
    window_minutes INT          NOT NULL DEFAULT 30,
    post_count     INT          NOT NULL DEFAULT 0,
    negative_pct   FLOAT        NOT NULL DEFAULT 0.0,
    detected_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_subreddit   ON sentiment.trend_alerts (subreddit);
CREATE INDEX IF NOT EXISTS idx_alerts_detected_at ON sentiment.trend_alerts (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON sentiment.trend_alerts (severity);

-- ── Weekly Digests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment.weekly_digests (
    id                  UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start          DATE  NOT NULL,
    week_end            DATE  NOT NULL,
    subreddits          JSONB NOT NULL DEFAULT '[]',
    summary             TEXT  NOT NULL DEFAULT '',
    top_topics          JSONB NOT NULL DEFAULT '[]',
    sentiment_breakdown JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digests_week_start ON sentiment.weekly_digests (week_start DESC);

-- ── Watched Subreddits ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment.watched_subreddits (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(128) NOT NULL UNIQUE,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    added_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default subreddits
INSERT INTO sentiment.watched_subreddits (name) VALUES
    ('python'), ('MachineLearning'), ('LocalLLaMA')
ON CONFLICT (name) DO NOTHING;
