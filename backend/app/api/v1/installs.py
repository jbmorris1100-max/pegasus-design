"""Pegasus Design — Installs API"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from app.core.database import get_db
from app.models.installs import Install

router = APIRouter()

@router.post("/")
async def create_install(
    project_id: str = Body(...), scheduled_date: str = Body(None),
    lead_installer: str = Body(None), crew_members: str = Body(""),
    notes: str = Body(None), address: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    inst = Install(
        project_id=project_id,
        scheduled_date=date.today() if not scheduled_date else scheduled_date,
        lead_installer=lead_installer, notes=notes, address=address,
        crew=[m.strip() for m in crew_members.split(",") if m.strip()] if crew_members else [],
        crew_members=[m.strip() for m in crew_members.split(",") if m.strip()] if crew_members else [],
        estimated_hours=0, status="scheduled")
    db.add(inst); await db.commit(); await db.refresh(inst)
    return {"id": str(inst.id), "status": inst.status, "created": True}
