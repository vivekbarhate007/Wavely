from __future__ import annotations

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager

from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from database import engine
from routes import router
from ws_manager import manager

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC_PROCESSED = "sentiment.processed"

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("sentiment_service")


async def _kafka_broadcast_loop() -> None:
    """Consume sentiment.processed topic and broadcast each event to WS clients."""
    consumer = AIOKafkaConsumer(
        TOPIC_PROCESSED,
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id="sentiment-service-ws",
        auto_offset_reset="latest",
    )
    try:
        await consumer.start()
        logger.info("WS Kafka consumer started on topic %s", TOPIC_PROCESSED)
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode("utf-8"))
                await manager.broadcast({"type": "new_post", "data": data})
            except Exception:
                logger.exception("Failed to broadcast Kafka message")
    except Exception:
        logger.exception("WS Kafka consumer error")
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_kafka_broadcast_loop())
    logger.info("Sentiment service started.")
    yield
    task.cancel()
    await engine.dispose()
    logger.info("Sentiment service stopped.")


app = FastAPI(title="SentimentPulse Sentiment Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sentiment"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()   # keep connection alive; ignore client messages
    except WebSocketDisconnect:
        manager.disconnect(ws)
