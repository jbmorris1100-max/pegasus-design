"""Pegasus Design — Installs API"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from typing import Optional

from app.core.database import get_db
from app.models.installs import Install

router = APIRouter()


def _parse_date(s):
    if s is None:
        return None
    if isinstance(s, date):
        return s
    if isinstance(s, str) and s.strip():
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    return None


@router.get("/")
async def list_installs(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Install)
    if status:
        query = query.where(Install.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.options(selectinload(Install.project))
        .order_by(Install.scheduled_date.asc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for inst in result.scalars():
        items.append({
            "id": str(inst.id),
            "project_id": str(inst.project_id) if inst.project_id else "",
            "project_name": inst.project.name if inst.project else "Unknown",
            "status": inst.status,
            "scheduled_date": str(inst.scheduled_date) if inst.scheduled_date else "",
            "lead_installer": inst.lead_installer,
            "address": inst.address,
            "estimated_hours": float(inst.estimated_hours or 0),
            "notes": inst.notes,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_install(
    project_id: str = Body(...),
    scheduled_date: str = Body(None),
    lead_installer: str = Body(None),
    crew_members: str = Body(""),
    notes: str = Body(None),
    address: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    crew = [m.strip() for m in crew_members.split(",") if m.strip()] if crew_members else []
    inst = Install(
        project_id=project_id,
        scheduled_date=_parse_date(scheduled_date) or date.today(),
        lead_installer=lead_installer,
        notes=notes,
        address=address,
        crew=crew,
        estimated_hours=0,
        status="scheduled",
    )
    db.add(inst)
    try:
        await db.commit()
        await db.refresh(inst)
    except Exception as e:
        await db.rollback()
        print(f"[installs] create error: {e}")
        raise
    print(f"[installs] created {inst.id} for project {project_id}")
    return {"id": str(inst.id), "status": inst.status, "created": True}
