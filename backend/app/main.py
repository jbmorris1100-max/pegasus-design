import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()

# ── Cloudinary startup check ─────────────────────────────────
import cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)
print("CLOUDINARY CONFIG:", {
    "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
    "api_key": os.getenv("CLOUDINARY_API_KEY"),
    "api_secret": "SET" if os.getenv("CLOUDINARY_API_SECRET") else "MISSING",
})

# ── CORS origins ────────────────────────────────────────────
_static_origins = [
    "https://pegasus-design.vercel.app",
    "https://pegasus-design-git-main-jbmorris1100-7601s-projects.vercel.app",
    "https://pegasus-design-7h5kx9zef-jbmorris1100-7601s-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]
_extra_origins = [o.strip() for o in os.getenv("EXTRA_ALLOWED_ORIGINS", "").split(",") if o.strip()]
_all_origins = _extra_origins + _static_origins


def _run_migrations() -> None:
    """Run alembic migrations synchronously (called from a worker thread)."""
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    try:
        await asyncio.to_thread(_run_migrations)
        print("Database migrations applied.")
    except Exception as e:
        print(f"Migration error (non-fatal): {e}")
    yield


app = FastAPI(
    title="Pegasus Design — Operations Command Center",
    description="Executive intelligence layer for high-end custom cabinet and millwork operations",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=_all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──────────────────────────────────────────────────
from app.api.v1.router import api_router
from app.api.ws.handler import websocket_endpoint

app.include_router(api_router, prefix="/api/v1")

# ── WebSocket ───────────────────────────────────────────────
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "pegasus-design", "environment": settings.environment}
