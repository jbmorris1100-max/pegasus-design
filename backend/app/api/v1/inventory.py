"""Pegasus Design — Inventory API"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.scheduling import InventoryItem

router = APIRouter()


def _item_dict(item: InventoryItem) -> dict:
    return {
        "id": str(item.id),
        "name": item.name,
        "sku": item.sku,
        "category": item.category,
        "unit": item.unit,
        "quantity_on_hand": float(item.quantity_on_hand or 0),
        "reorder_point": float(item.reorder_point or 0),
        "reorder_quantity": float(item.reorder_quantity or 0),
        "unit_cost": float(item.unit_cost or 0),
        "supplier": item.supplier,
        "supplier_sku": item.supplier_sku,
        "lead_time_days": item.lead_time_days,
        "low_stock_alert": item.low_stock_alert == "true",
        "notes": item.notes,
    }


@router.get("/")
async def list_inventory(
    category: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(InventoryItem)
    if category:
        query = query.where(InventoryItem.category == category)
    if low_stock is True:
        query = query.where(InventoryItem.low_stock_alert == "true")

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.order_by(InventoryItem.name)
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = [_item_dict(i) for i in result.scalars()]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_inventory_item(
    name: str = Body(...),
    category: str = Body("supplies"),
    quantity_on_hand: float = Body(0),
    unit: str = Body("ea"),
    reorder_point: float = Body(0),
    supplier: str = Body(None),
    unit_cost: float = Body(0),
    sku: str = Body(None),
    notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    low_stock = "true" if quantity_on_hand <= reorder_point and reorder_point > 0 else "false"
    item = InventoryItem(
        name=name, category=category, quantity_on_hand=quantity_on_hand,
        unit=unit, reorder_point=reorder_point, supplier=supplier,
        unit_cost=unit_cost, sku=sku, low_stock_alert=low_stock, notes=notes,
    )
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except Exception as e:
        await db.rollback()
        print(f"[inventory] create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    print(f"[inventory] created {item.id} — {item.name}")
    return {"id": str(item.id), "name": item.name, "created": True}


@router.get("/{item_id}")
async def get_inventory_item(item_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _item_dict(item)


@router.put("/{item_id}")
async def update_inventory_item(
    item_id: str,
    name: str = Body(None),
    category: str = Body(None),
    quantity_on_hand: float = Body(None),
    unit: str = Body(None),
    reorder_point: float = Body(None),
    unit_cost: float = Body(None),
    supplier: str = Body(None),
    sku: str = Body(None),
    notes: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if name is not None:
        item.name = name
    if category is not None:
        item.category = category
    if quantity_on_hand is not None:
        item.quantity_on_hand = quantity_on_hand
    if unit is not None:
        item.unit = unit
    if reorder_point is not None:
        item.reorder_point = reorder_point
    if unit_cost is not None:
        item.unit_cost = unit_cost
    if supplier is not None:
        item.supplier = supplier
    if sku is not None:
        item.sku = sku
    if notes is not None:
        item.notes = notes

    # Recompute low stock alert
    qoh = item.quantity_on_hand or 0
    rp = item.reorder_point or 0
    item.low_stock_alert = "true" if qoh <= rp and rp > 0 else "false"

    try:
        await db.commit()
        await db.refresh(item)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": str(item.id), "name": item.name, "updated": True}


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await db.delete(item)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": item_id, "deleted": True}
