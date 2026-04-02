"""
Seed the local Wavely database with realistic sample data.
Run: python scripts/seed_db.py
"""
import asyncio, os, uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://pulse:pulse_secret@localhost:5432/wavely"
)

engine = create_async_engine(DATABASE_URL, echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)

now = datetime.now(tz=timezone.utc)

POSTS = [
    ("abc001", "MachineLearning", "Llama 3.3 70B beats GPT-4 on several benchmarks — detailed analysis",
     "Comprehensive benchmarks showing Llama 3.3 70B outperforming GPT-4 on MMLU, HumanEval, and reasoning tasks. The open-source community has been waiting for this moment.",
     "ml_researcher", 1847, "https://reddit.com/r/MachineLearning/comments/abc001", -3600),
    ("abc002", "LocalLLaMA", "Running 70B models locally on M4 Max — my experience after 2 weeks",
     "After 2 weeks of running Llama 3.3 70B quantized on my M4 Max with 128GB RAM, here is what I learned. Inference speed is around 15 tok/s at Q4_K_M which is very usable.",
     "local_ai_fan", 934, "https://reddit.com/r/LocalLLaMA/comments/abc002", -7200),
    ("abc003", "python", "Why is pip dependency resolution still so painful in 2026?",
     "I have been fighting pip for 3 hours trying to install a simple ML stack. Conflicting dependencies everywhere. Why is this still unsolved? uv is great but not everyone uses it.",
     "frustrated_dev", 723, "https://reddit.com/r/python/comments/abc003", -10800),
    ("abc004", "MachineLearning", "Survey: State of ML infrastructure at mid-size companies in 2026",
     "We surveyed 450 ML engineers at companies with 100-1000 employees. Key findings: 67% use cloud-hosted models, 31% run local inference, 2% fully on-premise.",
     "ml_survey_bot", 512, "https://reddit.com/r/MachineLearning/comments/abc004", -14400),
    ("abc005", "python", "uv is the best thing to happen to Python packaging — a love letter",
     "I switched my entire team from pip+venv to uv last quarter. Install times dropped from 4 minutes to 8 seconds. Lockfiles just work. Dependency resolution never fails. I am in love.",
     "uv_convert", 2103, "https://reddit.com/r/python/comments/abc005", -18000),
    ("abc006", "LocalLLaMA", "GGUF quantization artifacts ruining my outputs — anyone else?",
     "Getting strange repetitive tokens and hallucinations specifically with Q3_K_S quantization. Q4 and above seem fine. Is this a known issue with llama.cpp?",
     "quant_issues", 287, "https://reddit.com/r/LocalLLaMA/comments/abc006", -21600),
    ("abc007", "MachineLearning", "Mixture of Experts is now the dominant architecture — here is why",
     "Looking at the last 12 months of released models, MoE has clearly won. Better FLOP efficiency, lower inference cost, and quality on par with dense models.",
     "arch_watcher", 1456, "https://reddit.com/r/MachineLearning/comments/abc007", -25200),
    ("abc008", "python", "Python 3.14 free-threaded mode is actually production-ready now",
     "After testing free-threaded Python 3.14t on our CPU-bound web scraping pipeline, we are seeing 3.8x throughput improvement with no code changes. The GIL is finally gone.",
     "threading_fan", 891, "https://reddit.com/r/python/comments/abc008", -28800),
    ("abc009", "LocalLLaMA", "My homelab LLM setup: 4x RTX 4090 running Mixtral 8x22B",
     "Full setup guide for running Mixtral 8x22B across 4 GPUs using vLLM tensor parallel. Getting 45 tok/s throughput. Total cost was around $8000 in hardware.",
     "homelab_hero", 634, "https://reddit.com/r/LocalLLaMA/comments/abc009", -32400),
    ("abc010", "python", "FastAPI vs Django in 2026 — which should you choose?",
     "After building production apps with both, here is my honest take. FastAPI wins for APIs and microservices. Django wins for monoliths with ORM-heavy operations and admin panels.",
     "webdev_vivek", 445, "https://reddit.com/r/python/comments/abc010", -36000),
    ("abc011", "MachineLearning", "Reproducibility crisis in ML is getting worse, not better",
     "Attempted to reproduce 20 papers from NeurIPS 2025. Only 6 ran without modification. 9 had missing code. 5 had wrong results. We need better standards.",
     "repro_crisis", 978, "https://reddit.com/r/MachineLearning/comments/abc011", -39600),
    ("abc012", "LocalLLaMA", "Ollama 2.0 released — multimodal support is finally smooth",
     "Tried the new Ollama with Llava-Next and it just works. Pull model, run, send images via API. No config needed. This is how local AI should be.",
     "ollama_fan", 762, "https://reddit.com/r/LocalLLaMA/comments/abc012", -43200),
]

SENTIMENTS = [
    ("positive", 0.92, "Enthusiastic reception of new open-source model performance results.", ["LLM benchmarks", "open source AI", "Llama 3.3", "model comparison"]),
    ("positive", 0.88, "Positive hands-on experience with local inference on Apple Silicon.", ["local inference", "Apple Silicon", "M4 Max", "quantization"]),
    ("negative", 0.85, "Frustration expressed about Python packaging tooling and dependency conflicts.", ["pip", "dependency hell", "packaging", "uv"]),
    ("neutral",  0.79, "Informational survey results with no strong positive or negative lean.", ["ML infrastructure", "MLOps", "industry survey", "cloud vs local"]),
    ("positive", 0.96, "Overwhelmingly positive sentiment about uv package manager productivity gains.", ["uv", "Python packaging", "developer tools", "pip alternative"]),
    ("negative", 0.81, "User reporting quality issues with heavily quantized model outputs.", ["GGUF", "quantization", "model quality", "llama.cpp"]),
    ("positive", 0.90, "Strong positive framing of MoE architectural trend with solid reasoning.", ["MoE", "model architecture", "efficiency", "inference cost"]),
    ("positive", 0.94, "Very positive about free-threaded Python and GIL removal performance gains.", ["GIL", "Python 3.14", "threading", "performance"]),
    ("positive", 0.83, "Enthusiastic homelab build post with detailed technical breakdown.", ["homelab", "GPU cluster", "vLLM", "Mixtral"]),
    ("neutral",  0.72, "Balanced comparison post with pros and cons of both frameworks.", ["FastAPI", "Django", "web frameworks", "Python"]),
    ("negative", 0.87, "Critical post about reproducibility failures in published ML research.", ["reproducibility", "ML research", "NeurIPS", "open science"]),
    ("positive", 0.89, "Positive reception of Ollama multimodal support improvements.", ["Ollama", "multimodal AI", "local inference", "llava"]),
]

ALERTS = [
    ("python", "negative_spike", "A surge of negative posts in r/python over the last 30 minutes, primarily driven by frustrations around pip dependency resolution and conflicting package versions. Community sentiment has shifted sharply downward with 68% of recent posts expressing dissatisfaction with the current packaging ecosystem.",
     "high", 30, 22, 0.68, -1800),
    ("LocalLLaMA", "negative_spike", "Moderate negative sentiment detected in r/LocalLLaMA. Users are reporting quality degradation in GGUF quantized models at low bit depths, with several posts describing artifact issues and repetitive token generation.",
     "medium", 30, 14, 0.61, -5400),
    ("MachineLearning", "negative_spike", "Low-level negative sentiment spike in r/MachineLearning around reproducibility concerns in recently published papers. The discussion is constructive but carries an overall negative tone regarding research standards.",
     "low", 60, 11, 0.62, -14400),
]

DIGEST_SUMMARY = """## Weekly Sentiment Digest — March 25–April 1, 2026

This week saw **overall positive sentiment** across all three tracked communities, with 61% of posts classified as positive. The dominant themes were excitement around open-source LLM progress and Python tooling improvements.

**r/MachineLearning** was driven by Llama 3.3 70B benchmark results and a growing conversation around MoE architectures. Reproducibility concerns created a notable negative thread mid-week.

**r/LocalLLaMA** remained highly active with homelab builds and Apple Silicon performance posts trending positively, partially offset by GGUF quantization quality issues.

**r/python** saw two distinct clusters: strong praise for uv and free-threaded Python 3.14, contrasted with ongoing packaging frustration that triggered a high-severity alert on Tuesday."""

async def seed():
    async with Session() as db:
        # Clear existing data
        await db.execute(text("TRUNCATE sentiment.weekly_digests, sentiment.trend_alerts, sentiment.post_sentiments, sentiment.posts RESTART IDENTITY CASCADE"))
        await db.commit()

        post_ids = []
        for i, (rid, sub, title, body, author, score, url, delta) in enumerate(POSTS):
            pid = uuid.uuid4()
            post_ids.append(pid)
            created = now + timedelta(seconds=delta)
            await db.execute(text("""
                INSERT INTO sentiment.posts (id, reddit_id, subreddit, title, body, author, upvote_score, url, created_utc, fetched_at)
                VALUES (:id, :rid, :sub, :title, :body, :author, :score, :url, :created, :fetched)
            """), {"id": pid, "rid": rid, "sub": sub, "title": title, "body": body,
                   "author": author, "score": score, "url": url, "created": created, "fetched": now})

        await db.commit()
        print(f"Inserted {len(post_ids)} posts")

        for i, (pid, (sent, conf, reason, topics)) in enumerate(zip(post_ids, SENTIMENTS)):
            processed = now + timedelta(seconds=POSTS[i][7] + 120)
            await db.execute(text("""
                INSERT INTO sentiment.post_sentiments (id, post_id, sentiment, confidence, reasoning, topics, processed_at)
                VALUES (:id, :pid, :sent, :conf, :reason, :topics::jsonb, :proc)
            """), {"id": uuid.uuid4(), "pid": pid, "sent": sent, "conf": conf,
                   "reason": reason, "topics": str(topics).replace("'", '"'), "proc": processed})

        await db.commit()
        print(f"Inserted {len(SENTIMENTS)} sentiments")

        for sub, atype, summary, sev, win, cnt, neg, delta in ALERTS:
            await db.execute(text("""
                INSERT INTO sentiment.trend_alerts (id, subreddit, alert_type, summary, severity, window_minutes, post_count, negative_pct, detected_at)
                VALUES (:id, :sub, :atype, :summary, :sev, :win, :cnt, :neg, :det)
            """), {"id": uuid.uuid4(), "sub": sub, "atype": atype, "summary": summary,
                   "sev": sev, "win": win, "cnt": cnt, "neg": neg, "det": now + timedelta(seconds=delta)})

        await db.commit()
        print(f"Inserted {len(ALERTS)} alerts")

        week_start = now - timedelta(days=7)
        await db.execute(text("""
            INSERT INTO sentiment.weekly_digests (id, week_start, week_end, subreddits, summary, top_topics, sentiment_breakdown, created_at)
            VALUES (:id, :ws, :we, :subs::jsonb, :summary, :topics::jsonb, :breakdown::jsonb, :created)
        """), {
            "id": uuid.uuid4(), "ws": week_start, "we": now,
            "subs": '["python","MachineLearning","LocalLLaMA"]',
            "summary": DIGEST_SUMMARY,
            "topics": '[{"topic":"LLM benchmarks","count":48},{"topic":"Python packaging","count":41},{"topic":"local inference","count":37},{"topic":"open source AI","count":33},{"topic":"quantization","count":29},{"topic":"MoE architecture","count":25},{"topic":"developer tools","count":22},{"topic":"Apple Silicon","count":19}]',
            "breakdown": '{"positive":184,"negative":78,"neutral":56}',
            "created": now,
        })
        await db.commit()
        print("Inserted weekly digest")
        print("\nAll done! Database seeded successfully.")

asyncio.run(seed())
