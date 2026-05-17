"""Pegasus Design — Projects API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.projects import Project, ProjectType, ProjectStatus, JobTask

router = APIRouter()


def _ev(val):
    """Return enum .value or the value itself."""
    return val.value if hasattr(val, "value") else val


def _parse_date(s) -> Optional[date]:
    """Convert a date string 'YYYY-MM-DD' to a date object; return None if empty."""
    if s is None:
        return None
    if isinstance(s, date):
        return s
    if isinstance(s, str) and s.strip():
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    return None


@router.get("/")
async def list_projects(
    status: Optional[str] = Query(None), risk_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None), page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100), db: AsyncSession = Depends(get_db),
):
    query = select(Project)
    if status:
        query = query.where(Project.status == status.lower())
    if risk_level:
        query = query.where(Project.risk_level == risk_level.lower())
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for p in result.scalars():
        items.append({
            "id": str(p.id),
            "customer_id": str(p.customer_id) if p.customer_id else "",
            "name": p.name,
            "project_type": _ev(p.project_type),
            "status": _ev(p.status),
            "risk_level": p.risk_level or "low",
            "target_completion": str(p.target_completion) if p.target_completion else None,
            "estimated_total": float(p.estimated_total or 0),
            "estimated_labor_hours": float(p.estimated_labor_hours or 0),
            "overdue": p.overdue,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_project(
    name: str = Body(...),
    description: str = Body(None),
    customer_id: str = Body(None),
    project_type: str = Body("other"),
    target_start: str = Body(None),
    target_completion: str = Body(None),
    estimated_total: float = Body(0),
    estimated_labor_hours: float = Body(0),
    db: AsyncSession = Depends(get_db),
):
    pt = getattr(ProjectType, project_type.upper(), ProjectType.OTHER)
    project_kwargs = dict(
        name=name,
        description=description,
        project_type=pt,
        status=ProjectStatus.LEAD,
        estimated_total=estimated_total,
        estimated_labor_hours=estimated_labor_hours,
        target_start=_parse_date(target_start) or date.today(),
        target_completion=_parse_date(target_completion) or date.today(),
    )
    if customer_id and customer_id.strip():
        from uuid import UUID
        try:
            project_kwargs["customer_id"] = UUID(customer_id)
        except ValueError:
            pass
    if "customer_id" not in project_kwargs:
        from app.models.crm import Customer
        r = await db.execute(select(Customer).limit(1))
        c = r.scalar_one_or_none()
        if c:
            project_kwargs["customer_id"] = c.id
        else:
            raise HTTPException(
                status_code=422,
                detail="No customers exist. Create a customer first before creating a project.",
            )
    p = Project(**project_kwargs)
    db.add(p)
    try:
        await db.commit()
        await db.refresh(p)
    except Exception as e:
        await db.rollback()
        print(f"[projects] create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    print(f"[projects] created {p.id} — {p.name}")
    return {"id": str(p.id), "name": p.name, "created": True}


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": str(p.id),
        "customer_id": str(p.customer_id) if p.customer_id else "",
        "name": p.name,
        "description": p.description,
        "project_type": _ev(p.project_type),
        "status": _ev(p.status),
        "risk_level": p.risk_level or "low",
        "target_start": str(p.target_start) if p.target_start else None,
        "target_completion": str(p.target_completion) if p.target_completion else None,
        "actual_start": str(p.actual_start) if p.actual_start else None,
        "actual_completion": str(p.actual_completion) if p.actual_completion else None,
        "install_date": str(p.install_date) if p.install_date else None,
        "estimated_total": float(p.estimated_total or 0),
        "actual_total": float(p.actual_total) if p.actual_total else None,
        "estimated_labor_hours": float(p.estimated_labor_hours or 0),
        "actual_labor_hours": float(p.actual_labor_hours) if p.actual_labor_hours else None,
        "estimated_material_cost": float(p.estimated_material_cost or 0),
        "actual_material_cost": float(p.actual_material_cost) if p.actual_material_cost else None,
        "margin_target": float(p.margin_target or 0.40),
        "margin_actual": float(p.margin_actual) if p.margin_actual else None,
        "overdue": p.overdue,
        "revision_count": p.revision_count,
        "address": p.address,
        "notes": p.notes,
        "tags": p.tags or [],
    }


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    name: str = Body(None),
    description: str = Body(None),
    project_type: str = Body(None),
    status: str = Body(None),
    risk_level: str = Body(None),
    target_start: str = Body(None),
    target_completion: str = Body(None),
    actual_start: str = Body(None),
    actual_completion: str = Body(None),
    install_date: str = Body(None),
    estimated_total: float = Body(None),
    estimated_labor_hours: float = Body(None),
    actual_total: float = Body(None),
    margin_target: float = Body(None),
    address: str = Body(None),
    notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if name is not None:
        p.name = name
    if description is not None:
        p.description = description
    if project_type is not None:
        p.project_type = getattr(ProjectType, project_type.upper(), ProjectType.OTHER)
    if status is not None:
        p.status = getattr(ProjectStatus, status.upper(), ProjectStatus.LEAD)
    if risk_level is not None:
        p.risk_level = risk_level.lower()
    if target_start is not None:
        p.target_start = _parse_date(target_start)
    if target_completion is not None:
        p.target_completion = _parse_date(target_completion)
    if actual_start is not None:
        p.actual_start = _parse_date(actual_start)
    if actual_completion is not None:
        p.actual_completion = _parse_date(actual_completion)
    if install_date is not None:
        p.install_date = _parse_date(install_date)
    if estimated_total is not None:
        p.estimated_total = estimated_total
    if estimated_labor_hours is not None:
        p.estimated_labor_hours = estimated_labor_hours
    if actual_total is not None:
        p.actual_total = actual_total
    if margin_target is not None:
        p.margin_target = margin_target
    if address is not None:
        p.address = address
    if notes is not None:
        p.notes = notes

    try:
        await db.commit()
        await db.refresh(p)
    except Exception as e:
        await db.rollback()
        print(f"[projects] update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "id": str(p.id), "name": p.name,
        "project_type": _ev(p.project_type),
        "status": _ev(p.status),
        "updated": True,
    }


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(p)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": project_id, "deleted": True}


@router.get("/{project_id}/tasks")
async def list_job_tasks(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobTask).where(JobTask.project_id == project_id).order_by(JobTask.sort_order)
    )
    tasks = []
    for t in result.scalars():
        tasks.append({
            "id": str(t.id), "project_id": str(t.project_id),
            "name": t.name, "description": t.description,
            "status": t.status, "assigned_to": t.assigned_to,
            "department": t.department,
            "estimated_hours": float(t.estimated_hours or 0),
            "actual_hours": float(t.actual_hours) if t.actual_hours else None,
            "due_date": str(t.due_date) if t.due_date else None,
            "sort_order": t.sort_order,
        })
    return {"items": tasks, "total": len(tasks)}
