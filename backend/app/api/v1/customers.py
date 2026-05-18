"""Pegasus Design — CRM / Customers API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.crm import Customer, Contact, CustomerType, CustomerStatus

router = APIRouter()


def _ev(val):
    """Return enum .value or the value itself if it's already a string."""
    return val.value if hasattr(val, "value") else val


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
        query = query.where(Customer.status == status.lower())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(Customer.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for c in result.scalars():
        items.append({
            "id": str(c.id), "name": c.name,
            "type": _ev(c.type), "customer_type": _ev(c.type),
            "status": _ev(c.status),
            "email": c.email, "phone": c.phone,
            "city": c.city, "state": c.state,
            "total_projects": c.total_projects,
            "total_revenue": float(c.total_revenue) if c.total_revenue else 0,
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
    customer_type: str = Body("residential"),
    db: AsyncSession = Depends(get_db),
):
    ct = getattr(CustomerType, customer_type.upper(), CustomerType.RESIDENTIAL)
    c = Customer(
        name=name, type=ct, status=CustomerStatus.ACTIVE,
        email=email, phone=phone, city=city, state=state, notes=notes,
    )
    db.add(c)
    try:
        await db.commit()
        await db.refresh(c)
    except Exception as e:
        await db.rollback()
        print(f"[customers] create error: {e}")
        raise
    print(f"[customers] created {c.id} — {c.name}")
    return {
        "id": str(c.id), "name": c.name,
        "customer_type": _ev(c.type),
        "status": _ev(c.status),
        "created": True,
    }


@router.get("/{customer_id}")
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
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
        "id": str(c.id), "name": c.name,
        "type": _ev(c.type), "customer_type": _ev(c.type),
        "status": _ev(c.status),
        "email": c.email, "phone": c.phone,
        "address_line1": c.address_line1, "address_line2": c.address_line2,
        "city": c.city, "state": c.state, "zip_code": c.zip_code,
        "notes": c.notes, "tags": c.tags or [],
        "access_code": c.access_code,
        "total_projects": c.total_projects,
        "total_revenue": float(c.total_revenue) if c.total_revenue else 0,
        "avg_margin": float(c.avg_margin) if c.avg_margin else None,
        "revision_frequency": c.revision_frequency,
        "contacts": contacts,
    }


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    name: str = Body(None),
    email: str = Body(None),
    phone: str = Body(None),
    city: str = Body(None),
    state: str = Body(None),
    notes: str = Body(None),
    address_line1: str = Body(None),
    address_line2: str = Body(None),
    zip_code: str = Body(None),
    customer_type: str = Body(None),
    status: str = Body(None),
    access_code: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    if name is not None:
        c.name = name
    if email is not None:
        c.email = email
    if phone is not None:
        c.phone = phone
    if city is not None:
        c.city = city
    if state is not None:
        c.state = state
    if notes is not None:
        c.notes = notes
    if address_line1 is not None:
        c.address_line1 = address_line1
    if address_line2 is not None:
        c.address_line2 = address_line2
    if zip_code is not None:
        c.zip_code = zip_code
    if customer_type is not None:
        c.type = getattr(CustomerType, customer_type.upper(), CustomerType.RESIDENTIAL)
    if status is not None:
        c.status = getattr(CustomerStatus, status.upper(), CustomerStatus.ACTIVE)
    if access_code is not None:
        c.access_code = access_code or None

    try:
        await db.commit()
        await db.refresh(c)
    except Exception as e:
        await db.rollback()
        print(f"[customers] update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "id": str(c.id), "name": c.name,
        "type": _ev(c.type), "customer_type": _ev(c.type),
        "status": _ev(c.status),
        "updated": True,
    }


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.delete(c)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": customer_id, "deleted": True}
