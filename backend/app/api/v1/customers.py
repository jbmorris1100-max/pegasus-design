"""Pegasus Design — CRM / Customers API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.crm import Customer, Contact, CustomerType, CustomerStatus

router = APIRouter()


@router.get("/")
async def list_customers(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Customer)
    if search:
        query = query.where(
            Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%")
        )
    if status:
        query = query.where(Customer.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(Customer.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for c in result.scalars():
        items.append({
            "id": str(c.id), "name": c.name, "type": str(c.type) if c.type else "RESIDENTIAL",
            "status": str(c.status) if c.status else "active", "email": c.email, "phone": c.phone,
            "city": c.city, "state": c.state,
            "total_projects": c.total_projects, "total_revenue": float(c.total_revenue) if c.total_revenue else 0,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_customer(
    name: str = Body(...),
    email: str = Body(None),
    phone: str = Body(None),
    city: str = Body(None),
    state: str = Body(None),
    notes: str = Body(None),
    customer_type: str = Body("RESIDENTIAL"),
    db: AsyncSession = Depends(get_db),
):
    ct = getattr(CustomerType, customer_type.upper(), CustomerType.RESIDENTIAL)
    c = Customer(name=name, type=ct, status=CustomerStatus.ACTIVE, email=email, phone=phone, city=city, state=state, notes=notes)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"id": str(c.id), "name": c.name, "status": str(c.status.value) if hasattr(c.status, 'value') else str(c.status), "created": True}


@router.get("/{customer_id}")
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        return {"id": customer_id, "name": "Not Found"}
    contacts_result = await db.execute(
        select(Contact).where(Contact.customer_id == customer_id)
    )
    contacts = []
    for ct in contacts_result.scalars():
        contacts.append({
            "id": str(ct.id), "first_name": ct.first_name, "last_name": ct.last_name,
            "email": ct.email, "phone": ct.phone, "role": ct.role,
        })
    return {
        "id": str(c.id), "name": c.name, "type": str(c.type) if c.type else "RESIDENTIAL",
        "status": str(c.status) if c.status else "active",
        "email": c.email, "phone": c.phone, "city": c.city, "state": c.state,
        "total_projects": c.total_projects, "total_revenue": float(c.total_revenue) if c.total_revenue else 0,
        "avg_margin": float(c.avg_margin) if c.avg_margin else None,
        "contacts": contacts,
    }
