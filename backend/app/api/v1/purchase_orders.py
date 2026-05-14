"""Pegasus Design — Purchase Orders API"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.scheduling import PurchaseOrder

router = APIRouter()

@router.post("/")
async def create_purchase_order(
    supplier: str = Body(...), total: float = Body(0),
    notes: str = Body(None), expected_at: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    po = PurchaseOrder(supplier=supplier, total=total, notes=notes,
                       expected_at=expected_at, status="draft")
    db.add(po); await db.commit(); await db.refresh(po)
    return {"id": str(po.id), "supplier": po.supplier, "created": True}
