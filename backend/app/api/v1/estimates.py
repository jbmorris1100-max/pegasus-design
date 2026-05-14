"""Pegasus Design — Estimating API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.estimating import Estimate, EstimateLineItem, EstimateStatus

router = APIRouter()

@router.get("/")
async def list_estimates(
    status: Optional[str] = Query(None), customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Estimate)
    if status: query = query.where(Estimate.status == status)
    if customer_id: query = query.where(Estimate.customer_id == customer_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.order_by(Estimate.updated_at.desc()).offset((page-1)*page_size).limit(page_size))
    items = []
    for e in result.scalars():
        items.append({"id":str(e.id),"customer_id":str(e.customer_id) if e.customer_id else "","project_id":str(e.project_id) if e.project_id else None,"title":e.title,"status":str(e.status),"revision_number":e.revision_number,"total":float(e.total or 0),"estimated_labor_hours":float(e.estimated_labor_hours or 0),"target_margin":float(e.target_margin or 0.40),"sent_at":e.sent_at,"approved_at":e.approved_at})
    return {"total":total,"page":page,"page_size":page_size,"items":items}

@router.post("/")
async def create_estimate(
    title: str = Body(...), project_id: str = Body(None), customer_id: str = Body(None),
    total: float = Body(0), estimated_labor_hours: float = Body(0),
    estimated_material_cost: float = Body(0), target_margin: float = Body(0.40),
    db: AsyncSession = Depends(get_db),
):
    e = Estimate(title=title, project_id=project_id or None, customer_id=customer_id or None,
                 status=EstimateStatus.DRAFT, total=total,
                 estimated_labor_hours=estimated_labor_hours,
                 estimated_material_cost=estimated_material_cost,
                 target_margin=target_margin)
    if not e.customer_id:
        from app.models.crm import Customer
        r = await db.execute(select(Customer).limit(1))
        c = r.scalar_one_or_none()
        if c: e.customer_id = c.id
    db.add(e); await db.commit(); await db.refresh(e)
    return {"id":str(e.id),"title":e.title,"created":True}

@router.get("/{estimate_id}")
async def get_estimate(estimate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estimate).where(Estimate.id == estimate_id))
    e = result.scalar_one_or_none()
    if not e: return {"id":estimate_id,"title":"Not Found"}
    items_result = await db.execute(select(EstimateLineItem).where(EstimateLineItem.estimate_id == estimate_id))
    line_items = [{"id":str(li.id),"description":li.description,"category":li.category,"quantity":float(li.quantity),"unit":li.unit,"unit_price":float(li.unit_price),"total_price":float(li.total_price)} for li in items_result.scalars()]
    return {"id":str(e.id),"title":e.title,"status":str(e.status),"revision_number":e.revision_number,"total":float(e.total or 0),"estimated_labor_hours":float(e.estimated_labor_hours or 0),"target_margin":float(e.target_margin or 0.40),"sent_at":e.sent_at,"approved_at":e.approved_at,"line_items":line_items}
