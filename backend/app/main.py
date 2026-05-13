"""Pegasus Design — FastAPI Application Entry Point"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api.v1.router import api_router
from app.api.ws.handler import websocket_endpoint

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup
    # In production, initialize DB connection pool, start background tasks, etc.
    yield
    # Shutdown
    # Gracefully close connections


app = FastAPI(
    title="Pegasus Design — Operations Command Center",
    description="Executive intelligence layer for high-end custom cabinet and millwork operations",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")

# ── WebSocket ───────────────────────────────────────────────
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "pegasus-design", "environment": settings.environment}
