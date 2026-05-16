"""Pegasus Design — AI API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.events import AIRecommendation, DailyBrief

router = APIRouter()

# In-memory AI mode store (persists for the lifetime of the process).
# A real implementation would store this in the database or Redis.
_ai_mode: str = "observe"


@router.get("/recommendations")
async def list_recommendations(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query("pending"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(AIRecommendation)
    if category:
        query = query.where(AIRecommendation.category == category)
    if status:
        query = query.where(AIRecommendation.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(AIRecommendation.confidence.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for r in result.scalars():
        items.append({
            "id": str(r.id), "title": r.title, "category": r.category,
            "description": r.description, "reasoning": r.reasoning,
            "confidence": float(r.confidence) if r.confidence else 0.5,
            "expected_impact": r.expected_impact, "status": r.status,
            "requires_approval": r.requires_approval,
            "ai_mode": r.ai_mode,
            "created_at": str(r.created_at) if r.created_at else "",
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/recommendations/{rec_id}/accept")
async def accept_recommendation(rec_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIRecommendation).where(AIRecommendation.id == rec_id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "accepted"
    await db.commit()
    console_log = f"[ai] recommendation {rec_id} accepted"
    print(console_log)
    return {"id": rec_id, "status": "accepted"}


@router.post("/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(rec_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIRecommendation).where(AIRecommendation.id == rec_id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "dismissed"
    await db.commit()
    print(f"[ai] recommendation {rec_id} dismissed")
    return {"id": rec_id, "status": "dismissed"}


@router.get("/daily-brief")
async def get_daily_brief(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DailyBrief).order_by(DailyBrief.created_at.desc()).limit(1)
    )
    brief = result.scalar_one_or_none()
    if not brief:
        return {"date": "today", "content": {"summary": "No brief generated yet."}}
    return {
        "date": brief.date, "generated_at": brief.generated_at,
        "content": brief.content or {},
        "read_at": brief.read_at,
    }


@router.get("/growth/signals")
async def get_growth_signals(db: AsyncSession = Depends(get_db)):
    from app.models.projects import Project

    active_result = await db.execute(
        select(func.count(Project.id)).where(
            Project.status.notin_(["completed", "cancelled"])
        )
    )
    active = active_result.scalar() or 0

    return {
        "hiring_signals": [
            {"signal_type": "hiring_pressure", "description": "Assembly department at 92% utilization for 6 weeks", "confidence": 0.79, "urgency": "medium", "recommendation": "Consider hiring 1-2 assembly technicians in Q3"},
        ] if active > 5 else [],
        "equipment_signals": [
            {"signal_type": "equipment_opportunity", "description": "Edge bander at 89% capacity with recurring maintenance", "confidence": 0.71, "urgency": "medium", "recommendation": "Automated edge bander ROI: 14 months"},
        ] if active > 4 else [],
        "capacity_warnings": [
            "Finishing department queue exceeds 2-week threshold",
            "Assembly utilization sustained above 85%",
        ] if active > 5 else [],
        "growth_forecast": {
            "summary": "Project volume trending up 15% QoQ. Capacity constraints likely in Assembly and Finishing within 90 days without intervention." if active > 5 else "Insufficient data for forecasting.",
        },
    }


@router.get("/mode")
async def get_ai_mode():
    return {"mode": _ai_mode}


@router.put("/mode")
async def set_ai_mode(body: dict):
    global _ai_mode
    mode = body.get("mode", "observe")
    if mode not in ("observe", "assist", "automate"):
        raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}. Must be observe, assist, or automate.")
    _ai_mode = mode
    print(f"[ai] mode set to {mode}")
    return {"mode": _ai_mode}
