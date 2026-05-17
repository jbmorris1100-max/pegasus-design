"""Pegasus Design — Estimating API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.estimating import Estimate, EstimateLineItem, EstimateStatus

router = APIRouter()


def _ev(val):
    """Return enum .value or the value itself."""
    return val.value if hasattr(val, "value") else val


@router.get("/")
async def list_estimates(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Estimate)
    if status:
        query = query.where(Estimate.status == status.lower())
    if customer_id:
        query = query.where(Estimate.customer_id == customer_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(Estimate.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for e in result.scalars():
        items.append({
            "id": str(e.id),
            "customer_id": str(e.customer_id) if e.customer_id else "",
            "project_id": str(e.project_id) if e.project_id else None,
            "title": e.title,
            "status": _ev(e.status),
            "revision_number": e.revision_number,
            "total": float(e.total or 0),
            "estimated_labor_hours": float(e.estimated_labor_hours or 0),
            "target_margin": float(e.target_margin or 0.40),
            "sent_at": e.sent_at,
            "approved_at": e.approved_at,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_estimate(
    title: str = Body(...),
    project_id: str = Body(None),
    customer_id: str = Body(None),
    total: float = Body(0),
    estimated_labor_hours: float = Body(0),
    estimated_material_cost: float = Body(0),
    target_margin: float = Body(0.40),
    db: AsyncSession = Depends(get_db),
):
    e = Estimate(
        title=title,
        project_id=project_id or None,
        customer_id=customer_id or None,
        status=EstimateStatus.DRAFT,
        total=total,
        estimated_labor_hours=estimated_labor_hours,
        estimated_material_cost=estimated_material_cost,
        target_margin=target_margin,
    )
    if not e.customer_id:
        from app.models.crm import Customer
        r = await db.execute(select(Customer).limit(1))
        c = r.scalar_one_or_none()
        if c:
            e.customer_id = c.id
    db.add(e)
    try:
        await db.commit()
        await db.refresh(e)
    except Exception as ex:
        await db.rollback()
        print(f"[estimates] create error: {ex}")
        raise HTTPException(status_code=500, detail=str(ex))
    return {"id": str(e.id), "title": e.title, "created": True}


@router.get("/{estimate_id}")
async def get_estimate(estimate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estimate).where(Estimate.id == estimate_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Estimate not found")
    items_result = await db.execute(
        select(EstimateLineItem).where(EstimateLineItem.estimate_id == estimate_id)
    )
    line_items = [
        {
            "id": str(li.id),
            "description": li.description,
            "category": li.category,
            "quantity": float(li.quantity or 1),
            "unit": li.unit,
            "unit_price": float(li.unit_price or 0),
            "total_price": float(li.total_price or 0),
            "labor_hours": float(li.labor_hours or 0),
            "material_cost": float(li.material_cost or 0),
            "sort_order": li.sort_order,
        }
        for li in items_result.scalars()
    ]
    return {
        "id": str(e.id),
        "customer_id": str(e.customer_id) if e.customer_id else "",
        "project_id": str(e.project_id) if e.project_id else None,
        "title": e.title,
        "status": _ev(e.status),
        "revision_number": e.revision_number,
        "subtotal": float(e.subtotal or 0),
        "tax_rate": float(e.tax_rate or 0),
        "tax_amount": float(e.tax_amount or 0),
        "total": float(e.total or 0),
        "estimated_labor_hours": float(e.estimated_labor_hours or 0),
        "estimated_material_cost": float(e.estimated_material_cost or 0),
        "target_margin": float(e.target_margin or 0.40),
        "sent_at": e.sent_at,
        "approved_at": e.approved_at,
        "expires_at": e.expires_at,
        "notes": e.notes,
        "terms": e.terms,
        "line_items": line_items,
    }


@router.put("/{estimate_id}")
async def update_estimate(
    estimate_id: str,
    title: str = Body(None),
    status: str = Body(None),
    project_id: str = Body(None),
    total: float = Body(None),
    subtotal: float = Body(None),
    tax_rate: float = Body(None),
    tax_amount: float = Body(None),
    estimated_labor_hours: float = Body(None),
    estimated_material_cost: float = Body(None),
    target_margin: float = Body(None),
    notes: str = Body(None),
    terms: str = Body(None),
    sent_at: str = Body(None),
    approved_at: str = Body(None),
    expires_at: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Estimate).where(Estimate.id == estimate_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Estimate not found")

    if title is not None:
        e.title = title
    if status is not None:
        e.status = getattr(EstimateStatus, status.upper(), EstimateStatus.DRAFT)
    if project_id is not None:
        e.project_id = project_id or None
    if total is not None:
        e.total = total
    if subtotal is not None:
        e.subtotal = subtotal
    if tax_rate is not None:
        e.tax_rate = tax_rate
    if tax_amount is not None:
        e.tax_amount = tax_amount
    if estimated_labor_hours is not None:
        e.estimated_labor_hours = estimated_labor_hours
    if estimated_material_cost is not None:
        e.estimated_material_cost = estimated_material_cost
    if target_margin is not None:
        e.target_margin = target_margin
    if notes is not None:
        e.notes = notes
    if terms is not None:
        e.terms = terms
    if sent_at is not None:
        e.sent_at = sent_at
    if approved_at is not None:
        e.approved_at = approved_at
    if expires_at is not None:
        e.expires_at = expires_at

    try:
        await db.commit()
        await db.refresh(e)
    except Exception as ex:
        await db.rollback()
        print(f"[estimates] update error: {ex}")
        raise HTTPException(status_code=500, detail=str(ex))

    return {
        "id": str(e.id), "title": e.title,
        "status": _ev(e.status),
        "updated": True,
    }


@router.delete("/{estimate_id}")
async def delete_estimate(estimate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estimate).where(Estimate.id == estimate_id))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Estimate not found")
    await db.delete(e)
    try:
        await db.commit()
    except Exception as ex:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(ex))
    return {"id": estimate_id, "deleted": True}
