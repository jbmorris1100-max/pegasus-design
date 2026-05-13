"""Pegasus Design — AI Recommendation Engine API"""
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/recommendations")
async def list_recommendations(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query("pending"),
    min_confidence: Optional[float] = Query(0.5),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """List AI-generated recommendations with filtering."""
    return {"total": 0, "page": page, "page_size": page_size, "items": []}


@router.get("/recommendations/{rec_id}")
async def get_recommendation(rec_id: str):
    """Get a specific recommendation with full supporting data."""
    return {"id": rec_id, "title": "Sample Recommendation"}


@router.post("/recommendations/{rec_id}/accept")
async def accept_recommendation(rec_id: str):
    """Accept an AI recommendation."""
    return {"id": rec_id, "status": "accepted"}


@router.post("/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(rec_id: str, reason: Optional[str] = None):
    """Dismiss an AI recommendation with optional reason."""
    return {"id": rec_id, "status": "dismissed", "reason": reason}


@router.post("/recommendations/{rec_id}/implement")
async def implement_recommendation(rec_id: str):
    """Mark a recommendation as implemented (requires approval for high-impact)."""
    return {"id": rec_id, "status": "implemented"}


@router.get("/daily-brief")
async def get_daily_brief():
    """Get the AI-generated morning brief for today."""
    return {
        "date": "2025-01-01",
        "generated_at": None,
        "content": {
            "summary": "Daily brief not yet generated.",
            "active_projects": [],
            "scheduled_installs": [],
            "at_risk": [],
            "bottlenecks": [],
            "recommendations": [],
            "kpis": {},
        },
    }


@router.post("/daily-brief/generate")
async def generate_daily_brief():
    """Force generate a daily brief (also runs on schedule via Celery)."""
    return {"status": "generating"}


@router.get("/growth/signals")
async def get_growth_signals():
    """Get growth intelligence signals — hiring, equipment, capacity."""
    return {
        "hiring_signals": [],
        "equipment_signals": [],
        "capacity_warnings": [],
        "growth_forecast": {"summary": "Insufficient data for forecasting."},
    }


@router.get("/mode")
async def get_ai_mode():
    """Get current AI operating mode."""
    return {"mode": "observe"}


@router.put("/mode")
async def set_ai_mode(mode: str):
    """Set AI operating mode: observe | assist | automate."""
    if mode not in ("observe", "assist", "automate"):
        return {"error": "Invalid mode"}, 400
    return {"mode": mode}
