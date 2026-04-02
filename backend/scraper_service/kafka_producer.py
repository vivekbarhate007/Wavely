from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from aiokafka import AIOKafkaProducer
from fastapi import Request

logger = logging.getLogger("scraper_service.kafka")

TOPIC_RAW_POSTS = "sentiment.raw.posts"


def _serialise(obj: Any) -> str:
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


async def publish(producer: AIOKafkaProducer, topic: str, payload: dict) -> None:
    try:
        data = json.dumps(payload, default=_serialise).encode("utf-8")
        await producer.send_and_wait(topic, data)
    except Exception:
        logger.exception("Failed to publish to topic %s", topic)


def get_producer(request: Request) -> AIOKafkaProducer:
    return request.app.state.kafka
