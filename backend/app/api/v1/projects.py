"""Pegasus Design — Projects API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.models.projects import Project, ProjectType, ProjectStatus

router = APIRouter()


@router.get("/")
async def list_projects(
    status: Optional[str] = Query(None), risk_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None), page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100), db: AsyncSession = Depends(get_db),
):
    query = select(Project)
    if status: query = query.where(Project.status == status)
    if risk_level: query = query.where(Project.risk_level == risk_level)
    if search: query = query.where(Project.name.ilike(f"%{search}%"))
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.order_by(Project.updated_at.desc()).offset((page-1)*page_size).limit(page_size))
    items = []
    for p in result.scalars():
        items.append({"id":str(p.id),"customer_id":str(p.customer_id) if p.customer_id else "","name":p.name,"project_type":str(p.project_type),"status":str(p.status),"risk_level":p.risk_level or "low","target_completion":str(p.target_completion) if p.target_completion else None,"estimated_total":float(p.estimated_total or 0),"estimated_labor_hours":float(p.estimated_labor_hours or 0),"overdue":p.overdue})
    return {"total":total,"page":page,"page_size":page_size,"items":items}


@router.post("/")
async def create_project(
    name: str = Body(...), description: str = Body(None),
    customer_id: str = Body(None), project_type: str = Body("OTHER"),
    target_start: str = Body(None), target_completion: str = Body(None),
    estimated_total: float = Body(0), estimated_labor_hours: float = Body(0),
    db: AsyncSession = Depends(get_db),
):
    pt = getattr(ProjectType, project_type.upper(), ProjectType.OTHER)
    project_kwargs = dict(name=name, description=description, project_type=pt, status=ProjectStatus.LEAD,
                          estimated_total=estimated_total, estimated_labor_hours=estimated_labor_hours,
                          target_start=date.today(), target_completion=date.today() if not target_completion else target_completion)
    if customer_id and customer_id.strip():
        from uuid import UUID
        try: project_kwargs["customer_id"] = UUID(customer_id)
        except ValueError: pass
    if "customer_id" not in project_kwargs:
        # Default to first customer
        from app.models.crm import Customer
        r = await db.execute(select(Customer).limit(1))
        c = r.scalar_one_or_none()
        if c: project_kwargs["customer_id"] = c.id
    p = Project(**project_kwargs)
    db.add(p); await db.commit(); await db.refresh(p)
    return {"id":str(p.id),"name":p.name,"created":True}


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p: return {"id":project_id,"name":"Not Found"}
    return {"id":str(p.id),"customer_id":str(p.customer_id) if p.customer_id else "","name":p.name,"description":p.description,"project_type":str(p.project_type),"status":str(p.status),"risk_level":p.risk_level or "low","target_completion":str(p.target_completion) if p.target_completion else None,"estimated_total":float(p.estimated_total or 0),"actual_total":float(p.actual_total) if p.actual_total else None,"estimated_labor_hours":float(p.estimated_labor_hours or 0),"margin_target":float(p.margin_target or 0.40),"overdue":p.overdue,"address":p.address,"notes":p.notes}
