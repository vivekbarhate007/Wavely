# SentimentPulse

A real-time AI-powered sentiment analysis dashboard for Hacker News. Posts are scraped every 5 minutes, analyzed by a LangGraph agent using Groq's free LLM API, and displayed on a live React dashboard with trend alerts and weekly digests.

---

## Screenshots

| Overview | Posts Feed |
|----------|-----------|
| ![Overview](docs/screenshots/overview.png) | ![Posts](docs/screenshots/posts.png) |

| Topics | Trend Alerts |
|--------|-------------|
| ![Topics](docs/screenshots/topics.png) | ![Alerts](docs/screenshots/alerts.png) |

**Weekly Digest**

![Digest](docs/screenshots/digest.png)

---

## Architecture Overview

```
Hacker News API
      │
      ▼
┌─────────────────────┐
│   Scraper Service   │  FastAPI · port 8001
│  (asyncpraw/aiohttp)│  Fetches HN feeds → saves to DB → publishes to Kafka
└─────────┬───────────┘
          │  Kafka topic: sentiment.raw.posts
          ▼
┌─────────────────────┐
│  Sentiment Agent    │  LangGraph · Groq LLM (llama-3.3-70b-versatile)
│  (Kafka consumer)   │  Analyzes sentiment → extracts topics → detects trends
└─────────┬───────────┘
          │  Writes to PostgreSQL
          ▼
┌─────────────────────┐
│  Sentiment Service  │  FastAPI · port 8002 (read-only API)
└─────────┬───────────┘
          │  REST API via Vite proxy (/api)
          ▼
┌─────────────────────┐
│     Frontend        │  Vite + React + TypeScript · port 3000
└─────────────────────┘
```

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Language | Python 3.10+ |
| API Framework | FastAPI 0.115 |
| ASGI Server | Uvicorn |
| ORM | SQLAlchemy 2.0 (async) |
| DB Driver | asyncpg |
| Message Broker | Apache Kafka (aiokafka) |
| Task Scheduling | APScheduler |
| HTTP Client | aiohttp |
| Data Validation | Pydantic v2 |

### AI Agent

| Component | Technology |
|-----------|-----------|
| Agent Framework | LangGraph 1.x |
| LLM Provider | Groq (free tier) |
| Model | llama-3.3-70b-versatile |
| LangChain Integration | langchain-groq |
| Retry Logic | tenacity |

### Database

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 15+ |
| Schema | `sentiment` (isolated namespace) |
| Extensions | uuid-ossp |

### Frontend

| Component | Technology |
|-----------|-----------|
| Build Tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| HTTP Client | Axios |
| Routing | React Router v6 |

---

## Project Structure

```
SentimentPulse/
├── agents/
│   ├── sentiment_agent.py      # LangGraph agent (core AI logic)
│   └── requirements.txt
├── backend/
│   ├── scraper_service/        # Fetches HN posts → Kafka producer (port 8001)
│   │   ├── main.py
│   │   ├── scraper.py          # HN API client
│   │   ├── kafka_producer.py
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── routes.py           # API routes
│   │   └── database.py
│   └── sentiment_service/      # Read-only REST API (port 8002)
│       ├── main.py
│       ├── routes.py
│       └── database.py
├── frontend/
│   └── src/
│       ├── api/client.ts       # Typed API client + mock fallback
│       ├── components/
│       │   ├── Layout.tsx      # Top nav layout
│       │   ├── PostDrawer.tsx  # Slide-over post detail panel
│       │   ├── charts/         # Recharts wrappers
│       │   └── ui/             # Badge, Card components
│       └── pages/
│           ├── Overview.tsx    # KPI cards + trend chart
│           ├── Posts.tsx       # Post feed with Go to Article
│           ├── Topics.tsx      # Topic frequency chart
│           ├── Alerts.tsx      # Expandable trend alerts
│           └── Digest.tsx      # Weekly AI digest
├── infra/
│   └── init.sql                # PostgreSQL schema bootstrap
├── scripts/
│   └── seed_db.py              # Sample data seeder
├── start_scraper.sh            # Start scraper service
├── start_agent.sh              # Start sentiment agent
├── docker-compose.yml
└── .env
```

---

## LangGraph Agent — Deep Dive

The agent is built with LangGraph and processes each Hacker News post through a multi-node graph:

```
ingest_node
    │
    ▼
analyze_sentiment_node  ── Groq LLM → {sentiment, confidence, reasoning}
    │
    ▼
extract_topics_node     ── Groq LLM → ["topic1", "topic2", ...]
    │
    ▼
detect_trends_node      ── Queries DB: negative posts in last 30 min
    │
    ├─[spike detected]──▶ generate_alert_node ── Groq LLM → alert summary
    │                                                │
    └─[no spike]─────────────────────────────────▶ store_node ── saves to DB
```

### Agent State

```python
class AgentState(TypedDict):
    raw_post:    dict          # raw HN post data from Kafka
    post_id:     str           # UUID assigned on DB insert
    subreddit:   str           # HN feed name (top/ask/show)
    sentiment:   str           # positive | negative | neutral
    confidence:  float         # 0.0 – 1.0
    reasoning:   str           # one-sentence LLM explanation
    topics:      list[str]     # 3–5 extracted topic strings
    trend_alert: Optional[dict]# set if negative spike detected
    stored:      bool
    error:       Optional[str]
```

### Trend Alert Detection

A trend alert is triggered when:
- ≥ 10 posts analyzed in the last 30 minutes for a feed
- > 60% of those posts are classified as negative

Severity levels:
- `high` — negative rate > 80%
- `medium` — negative rate > 70%
- `low` — negative rate > 60%

### Rate Limiting

Groq free tier allows 30 requests/minute. The agent uses `asyncio.Semaphore(3)` to cap concurrent LLM invocations and adds a 2-second sleep per processed post to stay within limits.

---

## Database Schema

All tables live in the `sentiment` PostgreSQL schema.

### `sentiment.posts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Internal ID |
| reddit_id | VARCHAR | HN item ID (reused field name) |
| subreddit | VARCHAR | HN feed (top/ask/show) |
| title | TEXT | Article title |
| body | TEXT | Post body (Ask HN / Show HN text) |
| author | VARCHAR | HN username |
| upvote_score | INT | HN points |
| url | TEXT | HN discussion URL |
| created_utc | TIMESTAMPTZ | Original post time |
| fetched_at | TIMESTAMPTZ | When scraped |

### `sentiment.post_sentiments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| post_id | UUID FK | References posts |
| sentiment | VARCHAR | positive / negative / neutral |
| confidence | FLOAT | 0.0 – 1.0 |
| reasoning | TEXT | LLM explanation |
| topics | JSONB | Array of topic strings |
| processed_at | TIMESTAMPTZ | When analyzed |

### `sentiment.trend_alerts`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| subreddit | VARCHAR | HN feed that triggered alert |
| alert_type | VARCHAR | negative_spike |
| summary | TEXT | AI-generated 2–3 sentence summary |
| severity | VARCHAR | low / medium / high |
| window_minutes | INT | Analysis window |
| post_count | INT | Posts in window |
| negative_pct | FLOAT | Fraction that were negative |
| detected_at | TIMESTAMPTZ | When alert fired |

### `sentiment.weekly_digests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| week_start / week_end | DATE | Digest period |
| subreddits | JSONB | Feeds included |
| summary | TEXT | AI markdown summary |
| top_topics | JSONB | `[{topic, count}]` |
| sentiment_breakdown | JSONB | `{positive, negative, neutral}` |

### `sentiment.watched_subreddits`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| name | VARCHAR | Feed name (top/ask/show) |
| active | BOOLEAN | Whether to scrape |

---

## REST API Reference

### Scraper Service — port 8001

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/subreddits` | List active HN feeds |
| POST | `/subreddits` | Add a feed to watch |
| DELETE | `/subreddits/{name}` | Remove a feed |
| POST | `/scrape/trigger` | Manually trigger a scrape |

### Sentiment Service — port 8002

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/health` | — | Health check |
| GET | `/stats` | — | KPI counts (posts, alerts, etc.) |
| GET | `/posts` | `subreddit`, `sentiment`, `limit`, `offset` | Paginated posts with sentiment |
| GET | `/topics` | `subreddit`, `hours` | Topic frequency + sentiment breakdown |
| GET | `/trends` | `subreddit`, `hours` | Hourly sentiment counts for chart |
| GET | `/alerts` | `subreddit`, `severity`, `limit` | Trend alerts list |
| GET | `/digest/latest` | — | Latest weekly digest |
| POST | `/digest/generate` | `subreddits[]` | Generate a new weekly digest via LLM |

---

## Running Locally

### Prerequisites

- Python 3.10+
- PostgreSQL 15+
- Apache Kafka
- Node.js 18+

### Setup

```bash
# 1. Clone and create virtualenv
python3 -m venv .venv
source .venv/bin/activate
pip install -r agents/requirements.txt
pip install -r backend/scraper_service/requirements.txt
pip install -r backend/sentiment_service/requirements.txt   # fastapi, uvicorn, sqlalchemy, asyncpg

# 2. Create the database and schema
psql -U postgres -c "CREATE USER pulse WITH PASSWORD 'pulse_secret';"
psql -U postgres -c "CREATE DATABASE sentimentpulse OWNER pulse;"
psql -h localhost -U pulse -d sentimentpulse -f infra/init.sql

# 3. Set environment variables
cp .env.example .env
# Edit .env — fill in GROQ_API_KEY

# 4. Create Kafka topic
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic sentiment.raw.posts --partitions 3 --replication-factor 1
```

### Start Services

```bash
# Terminal 1 — Read API
cd backend/sentiment_service
uvicorn main:app --host 0.0.0.0 --port 8002

# Terminal 2 — Scraper (fetches HN every 5 min)
./start_scraper.sh

# Terminal 3 — LangGraph Agent (Kafka consumer)
./start_agent.sh

# Terminal 4 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

### Manual Scrape Trigger

```bash
curl -X POST http://localhost:8001/scrape/trigger
```

### Generate Weekly Digest

```bash
curl -X POST http://localhost:8002/digest/generate
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/db` |
| `GROQ_API_KEY` | ✅ | Free key from https://console.groq.com |
| `GROQ_MODEL` | — | Default: `llama-3.3-70b-versatile` |
| `KAFKA_BOOTSTRAP_SERVERS` | — | Default: `localhost:9092` |
| `SUBREDDITS` | — | HN feeds to watch. Default: `top,ask,show` |
| `SCRAPE_INTERVAL_SECONDS` | — | Default: `300` (5 min) |
| `POSTS_PER_SUBREDDIT` | — | Default: `25` |
| `LOG_LEVEL` | — | Default: `INFO` |

---

## Data Flow

1. **APScheduler** fires every 5 minutes inside the scraper service
2. **HN API** (`hacker-news.firebaseio.com/v0`) is queried for top/ask/show story IDs
3. Each story is fetched concurrently, saved to `sentiment.posts`, and published to Kafka
4. **LangGraph agent** consumes the Kafka message, runs the 5-node graph:
   - Calls Groq twice per post (sentiment + topics)
   - Checks for negative spikes in the last 30 min
   - If spike detected → calls Groq a third time for alert summary
   - Saves `post_sentiments` row (and optionally `trend_alerts`)
5. **Frontend** polls `/api/stats`, `/api/posts`, `/api/trends`, `/api/alerts` on page load
6. The Vite dev proxy forwards `/api/*` → `http://localhost:8002`

---

## Hacker News Feeds

| Feed | Endpoint | Description |
|------|----------|-------------|
| `top` | `/topstories.json` | Highest-scoring current stories |
| `new` | `/newstories.json` | Most recently submitted |
| `ask` | `/askstories.json` | Ask HN posts |
| `show` | `/showstories.json` | Show HN posts |
| `best` | `/beststories.json` | Best stories |

Configure which feeds to scrape via the `SUBREDDITS` env var or the `/subreddits` API.
