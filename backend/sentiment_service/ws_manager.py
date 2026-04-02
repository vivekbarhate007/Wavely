from __future__ import annotations

import logging
from fastapi import WebSocket

logger = logging.getLogger("sentiment_service.ws")


class ConnectionManager:
    """Tracks active WebSocket connections and broadcasts messages to all of them."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info("WS client connected. total=%d", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard if hasattr(self._connections, "discard") else None
        try:
            self._connections.remove(ws)
        except ValueError:
            pass
        logger.info("WS client disconnected. total=%d", len(self._connections))

    async def broadcast(self, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
