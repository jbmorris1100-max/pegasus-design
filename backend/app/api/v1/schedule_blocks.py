"""Pegasus Design — Schedule Blocks API"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from typing import Optional

from app.core.database import get_db
from app.models.scheduling import ScheduleBlock, ScheduleBlockType

router = APIRouter()


@router.get("/")
async def list_schedule_blocks(
    block_type: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ScheduleBlock)
    if block_type:
        query = query.where(ScheduleBlock.block_type == block_type)
    if department:
        query = query.where(ScheduleBlock.department == department)
    if status:
        query = query.where(ScheduleBlock.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.order_by(ScheduleBlock.start_date.asc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for block in result.scalars():
        items.append({
            "id": str(block.id),
            "title": block.title,
            "block_type": str(block.block_type),
            "department": block.department,
            "assigned_to": block.assigned_to,
            "start_date": str(block.start_date) if block.start_date else "",
            "end_date": str(block.end_date) if block.end_date else "",
            "estimated_hours": float(block.estimated_hours or 0),
            "status": block.status,
            "notes": block.notes,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_schedule_block(
    title: str = Body(...),
    block_type: str = Body("PRODUCTION"),
    start_date: str = Body(None),
    end_date: str = Body(None),
    department: str = Body(None),
    assigned_to: str = Body(None),
    estimated_hours: float = Body(0),
    notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    bt = getattr(ScheduleBlockType, block_type.upper(), ScheduleBlockType.PRODUCTION)
    block = ScheduleBlock(
        title=title, block_type=bt,
        start_date=date.today() if not start_date else start_date,
        end_date=date.today() if not end_date else end_date,
        department=department, assigned_to=assigned_to,
        estimated_hours=estimated_hours, notes=notes, status="scheduled",
    )
    db.add(block)
    try:
        await db.commit()
        await db.refresh(block)
    except Exception as e:
        await db.rollback()
        print(f"[schedule_blocks] create error: {e}")
        raise
    print(f"[schedule_blocks] created {block.id} — {block.title}")
    return {"id": str(block.id), "title": block.title, "created": True}
