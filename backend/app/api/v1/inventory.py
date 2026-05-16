"""Pegasus Design — Inventory API"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.scheduling import InventoryItem

router = APIRouter()


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
    items = []
    for item in result.scalars():
        items.append({
            "id": str(item.id),
            "name": item.name,
            "sku": item.sku,
            "category": item.category,
            "unit": item.unit,
            "quantity_on_hand": float(item.quantity_on_hand or 0),
            "reorder_point": float(item.reorder_point or 0),
            "unit_cost": float(item.unit_cost or 0),
            "supplier": item.supplier,
            "low_stock_alert": item.low_stock_alert == "true",
        })
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
    db: AsyncSession = Depends(get_db),
):
    low_stock = "true" if quantity_on_hand <= reorder_point and reorder_point > 0 else "false"
    item = InventoryItem(
        name=name, category=category, quantity_on_hand=quantity_on_hand,
        unit=unit, reorder_point=reorder_point, supplier=supplier,
        unit_cost=unit_cost, sku=sku, low_stock_alert=low_stock,
    )
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except Exception as e:
        await db.rollback()
        print(f"[inventory] create error: {e}")
        raise
    print(f"[inventory] created {item.id} — {item.name}")
    return {"id": str(item.id), "name": item.name, "created": True}
