"""Pegasus Design — WebSocket Handler for Real-Time Updates

Provides real-time push of:
- Dashboard metric changes
- New events
- AI recommendations
- Production status updates from InlineIQ
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Set
import json


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected clients."""
        payload = json.dumps(message)
        dead = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.add(connection)
        self.active_connections -= dead

    async def send_personal(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client."""
        await websocket.send_text(json.dumps(message))


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive client messages if needed
            data = await websocket.receive_text()
            # Client can send subscription preferences
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await manager.send_personal({"type": "pong"}, websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
