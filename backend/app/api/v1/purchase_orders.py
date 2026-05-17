"""Pegasus Design — Purchase Orders API"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.scheduling import PurchaseOrder, PurchaseOrderItem

router = APIRouter()


def _po_dict(po: PurchaseOrder) -> dict:
    return {
        "id": str(po.id),
        "supplier": po.supplier,
        "status": po.status,
        "project_id": str(po.project_id) if po.project_id else None,
        "total": float(po.total or 0),
        "ordered_at": po.ordered_at,
        "expected_at": po.expected_at,
        "received_at": po.received_at,
        "notes": po.notes,
    }


@router.get("/")
async def list_purchase_orders(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(PurchaseOrder)
    if status:
        query = query.where(PurchaseOrder.status == status.lower())
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(PurchaseOrder.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = [_po_dict(po) for po in result.scalars()]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_purchase_order(
    supplier: str = Body(...),
    total: float = Body(0),
    notes: str = Body(None),
    expected_at: str = Body(None),
    project_id: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    po = PurchaseOrder(
        supplier=supplier, total=total, notes=notes,
        expected_at=expected_at, status="draft",
    )
    if project_id:
        from uuid import UUID
        try:
            po.project_id = UUID(project_id)
        except ValueError:
            pass
    db.add(po)
    try:
        await db.commit()
        await db.refresh(po)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": str(po.id), "supplier": po.supplier, "created": True}


@router.get("/{po_id}")
async def get_purchase_order(po_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    items_result = await db.execute(
        select(PurchaseOrderItem).where(PurchaseOrderItem.purchase_order_id == po_id)
    )
    line_items = [
        {
            "id": str(li.id),
            "description": li.description,
            "quantity": float(li.quantity or 1),
            "unit": li.unit,
            "unit_price": float(li.unit_price or 0),
            "total_price": float(li.total_price or 0),
        }
        for li in items_result.scalars()
    ]
    data = _po_dict(po)
    data["line_items"] = line_items
    return data


@router.put("/{po_id}")
async def update_purchase_order(
    po_id: str,
    supplier: str = Body(None),
    status: str = Body(None),
    total: float = Body(None),
    notes: str = Body(None),
    expected_at: str = Body(None),
    received_at: str = Body(None),
    ordered_at: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if supplier is not None:
        po.supplier = supplier
    if status is not None:
        po.status = status.lower()
    if total is not None:
        po.total = total
    if notes is not None:
        po.notes = notes
    if expected_at is not None:
        po.expected_at = expected_at
    if received_at is not None:
        po.received_at = received_at
    if ordered_at is not None:
        po.ordered_at = ordered_at

    try:
        await db.commit()
        await db.refresh(po)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": str(po.id), "supplier": po.supplier, "updated": True}


@router.delete("/{po_id}")
async def delete_purchase_order(po_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    await db.delete(po)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": po_id, "deleted": True}
