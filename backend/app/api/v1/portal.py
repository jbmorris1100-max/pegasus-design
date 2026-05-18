"""Pegasus Design — Client Portal API"""
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Body, HTTPException, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.core.database import get_db
from app.models.crm import Customer
from app.models.projects import Project
from app.models.files import FileRecord, Message

router = APIRouter()

_SECRET    = os.getenv("PORTAL_JWT_SECRET", "pegasus-portal-secret-change-in-prod")
_ALGO      = "HS256"
_EXPIRE_HRS = 72


def _make_token(customer_id: str) -> str:
    payload = {
        "sub":  customer_id,
        "type": "portal",
        "exp":  datetime.now(timezone.utc) + timedelta(hours=_EXPIRE_HRS),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGO)


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login")
async def portal_login(
    email:       str = Body(...),
    access_code: str = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Customer).where(
            and_(
                Customer.email == email.strip().lower(),
                Customer.access_code == access_code.strip(),
            )
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(401, "Invalid email or access code")

    return {
        "token":         _make_token(str(customer.id)),
        "customer_id":   str(customer.id),
        "customer_name": customer.name,
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/{customer_id}")
async def portal_dashboard(customer_id: str, db: AsyncSession = Depends(get_db)):
    cust = (await db.execute(select(Customer).where(Customer.id == customer_id))).scalar_one_or_none()
    if not cust:
        raise HTTPException(404, "Customer not found")

    proj_rows = await db.execute(
        select(Project)
        .where(Project.customer_id == customer_id)
        .order_by(Project.updated_at.desc())
    )
    projects = []
    for p in proj_rows.scalars():
        ev = lambda v: v.value if hasattr(v, "value") else v  # noqa: E731
        projects.append({
            "id":                str(p.id),
            "name":              p.name,
            "status":            ev(p.status),
            "project_type":      ev(p.project_type),
            "target_completion": str(p.target_completion) if p.target_completion else None,
            "description":       p.description,
        })

    file_rows = await db.execute(
        select(FileRecord).where(
            and_(FileRecord.customer_id == customer_id, FileRecord.deleted_at.is_(None))
        ).order_by(FileRecord.created_at.desc())
    )
    files = [
        {
            "id":           str(f.id),
            "filename":     f.filename,
            "display_name": f.display_name or f.filename,
            "file_url":     f.file_url,
            "file_type":    f.file_type,
            "category":     f.category,
            "created_at":   f.created_at.isoformat() if f.created_at else None,
        }
        for f in file_rows.scalars()
    ]

    return {
        "customer": {"id": str(cust.id), "name": cust.name, "email": cust.email},
        "projects": projects,
        "files":    files,
    }


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/messages/{customer_id}")
async def get_messages(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).where(
            and_(Message.customer_id == customer_id, Message.deleted_at.is_(None))
        ).order_by(Message.created_at.asc())
    )
    return {
        "items": [
            {
                "id":          str(m.id),
                "customer_id": str(m.customer_id),
                "sender":      m.sender,
                "message":     m.message,
                "read_at":     m.read_at.isoformat() if m.read_at else None,
                "created_at":  m.created_at.isoformat() if m.created_at else None,
            }
            for m in result.scalars()
        ]
    }


@router.post("/messages/{customer_id}")
async def send_message(
    customer_id: str,
    message: str = Body(...),
    sender:  str = Body("company"),   # "company" | "client"
    db: AsyncSession = Depends(get_db),
):
    if sender not in ("company", "client"):
        sender = "company"
    msg = Message(customer_id=customer_id, sender=sender, message=message)
    db.add(msg)
    try:
        await db.commit()
        await db.refresh(msg)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
    return {
        "id":          str(msg.id),
        "customer_id": str(msg.customer_id),
        "sender":      msg.sender,
        "message":     msg.message,
        "created_at":  msg.created_at.isoformat() if msg.created_at else None,
    }


@router.get("/messages/unread-counts")
async def unread_counts(db: AsyncSession = Depends(get_db)):
    """Returns {customer_id: count} for customers with unread client messages."""
    result = await db.execute(
        select(Message.customer_id, func.count(Message.id).label("cnt")).where(
            and_(
                Message.sender == "client",
                Message.read_at.is_(None),
                Message.deleted_at.is_(None),
            )
        ).group_by(Message.customer_id)
    )
    return {str(row.customer_id): row.cnt for row in result}
