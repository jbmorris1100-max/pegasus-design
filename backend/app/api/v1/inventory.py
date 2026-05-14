"""Pegasus Design — Inventory API"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.scheduling import InventoryItem

router = APIRouter()

@router.post("/")
async def create_inventory_item(
    name: str = Body(...), category: str = Body("supplies"),
    quantity_on_hand: float = Body(0), unit: str = Body("ea"),
    reorder_point: float = Body(0), supplier: str = Body(None),
    unit_cost: float = Body(0), sku: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    item = InventoryItem(name=name, category=category, quantity_on_hand=quantity_on_hand,
                         unit=unit, reorder_point=reorder_point, supplier=supplier,
                         unit_cost=unit_cost, sku=sku)
    db.add(item); await db.commit(); await db.refresh(item)
    return {"id": str(item.id), "name": item.name, "created": True}
