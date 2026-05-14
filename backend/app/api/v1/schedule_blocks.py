"""Pegasus Design — Schedule Blocks API"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from app.core.database import get_db
from app.models.scheduling import ScheduleBlock, ScheduleBlockType

router = APIRouter()

@router.post("/")
async def create_schedule_block(
    title: str = Body(...), block_type: str = Body("PRODUCTION"),
    start_date: str = Body(None), end_date: str = Body(None),
    department: str = Body(None), assigned_to: str = Body(None),
    estimated_hours: float = Body(0), notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    bt = getattr(ScheduleBlockType, block_type.upper(), ScheduleBlockType.PRODUCTION)
    block = ScheduleBlock(
        title=title, block_type=bt,
        start_date=date.today() if not start_date else start_date,
        end_date=date.today() if not end_date else end_date,
        department=department, assigned_to=assigned_to,
        estimated_hours=estimated_hours, notes=notes, status="scheduled")
    db.add(block); await db.commit(); await db.refresh(block)
    return {"id": str(block.id), "title": block.title, "created": True}
