"""Pegasus Design — Schedule Blocks API"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime
from typing import Optional

from app.core.database import get_db
from app.models.scheduling import ScheduleBlock, ScheduleBlockType

router = APIRouter()


def _ev(val):
    """Return enum .value or the value itself."""
    return val.value if hasattr(val, "value") else val


def _parse_date(s) -> Optional[date]:
    if s is None:
        return None
    if isinstance(s, date):
        return s
    if isinstance(s, str) and s.strip():
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    return None


def _block_dict(block: ScheduleBlock) -> dict:
    return {
        "id": str(block.id),
        "title": block.title,
        "block_type": _ev(block.block_type),
        "department": block.department,
        "assigned_to": block.assigned_to,
        "project_id": str(block.project_id) if block.project_id else None,
        "start_date": str(block.start_date) if block.start_date else "",
        "end_date": str(block.end_date) if block.end_date else "",
        "estimated_hours": float(block.estimated_hours or 0),
        "actual_hours": float(block.actual_hours) if block.actual_hours else None,
        "status": block.status,
        "notes": block.notes,
    }


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
        query = query.where(ScheduleBlock.block_type == block_type.lower())
    if department:
        query = query.where(ScheduleBlock.department == department)
    if status:
        query = query.where(ScheduleBlock.status == status.lower())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.order_by(ScheduleBlock.start_date.asc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = [_block_dict(b) for b in result.scalars()]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_schedule_block(
    title: str = Body(...),
    block_type: str = Body("production"),
    start_date: str = Body(None),
    end_date: str = Body(None),
    department: str = Body(None),
    assigned_to: str = Body(None),
    estimated_hours: float = Body(0),
    notes: str = Body(None),
    project_id: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    bt = getattr(ScheduleBlockType, block_type.upper(), ScheduleBlockType.PRODUCTION)
    block = ScheduleBlock(
        title=title,
        block_type=bt,
        start_date=_parse_date(start_date) or date.today(),
        end_date=_parse_date(end_date) or date.today(),
        department=department,
        assigned_to=assigned_to,
        estimated_hours=estimated_hours,
        notes=notes,
        status="scheduled",
    )
    if project_id:
        from uuid import UUID
        try:
            block.project_id = UUID(project_id)
        except ValueError:
            pass
    db.add(block)
    try:
        await db.commit()
        await db.refresh(block)
    except Exception as e:
        await db.rollback()
        print(f"[schedule_blocks] create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    print(f"[schedule_blocks] created {block.id} — {block.title}")
    return {"id": str(block.id), "title": block.title, "created": True}


@router.get("/{block_id}")
async def get_schedule_block(block_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleBlock).where(ScheduleBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Schedule block not found")
    return _block_dict(block)


@router.put("/{block_id}")
async def update_schedule_block(
    block_id: str,
    title: str = Body(None),
    block_type: str = Body(None),
    start_date: str = Body(None),
    end_date: str = Body(None),
    department: str = Body(None),
    assigned_to: str = Body(None),
    estimated_hours: float = Body(None),
    actual_hours: float = Body(None),
    status: str = Body(None),
    notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScheduleBlock).where(ScheduleBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Schedule block not found")

    if title is not None:
        block.title = title
    if block_type is not None:
        block.block_type = getattr(ScheduleBlockType, block_type.upper(), ScheduleBlockType.PRODUCTION)
    if start_date is not None:
        block.start_date = _parse_date(start_date)
    if end_date is not None:
        block.end_date = _parse_date(end_date)
    if department is not None:
        block.department = department
    if assigned_to is not None:
        block.assigned_to = assigned_to
    if estimated_hours is not None:
        block.estimated_hours = estimated_hours
    if actual_hours is not None:
        block.actual_hours = actual_hours
    if status is not None:
        block.status = status.lower()
    if notes is not None:
        block.notes = notes

    try:
        await db.commit()
        await db.refresh(block)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": str(block.id), "title": block.title, "updated": True}


@router.delete("/{block_id}")
async def delete_schedule_block(block_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleBlock).where(ScheduleBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Schedule block not found")
    await db.delete(block)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": block_id, "deleted": True}
