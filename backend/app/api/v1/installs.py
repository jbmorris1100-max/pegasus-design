"""Pegasus Design — Installs API"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from typing import Optional

from app.core.database import get_db
from app.models.installs import Install

router = APIRouter()


def _parse_date(s) -> Optional[date]:
    if s is None:
        return None
    if isinstance(s, date):
        return s
    if isinstance(s, str) and s.strip():
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    return None


def _install_dict(inst: Install, include_project: bool = False) -> dict:
    d = {
        "id": str(inst.id),
        "project_id": str(inst.project_id) if inst.project_id else "",
        "status": inst.status,
        "scheduled_date": str(inst.scheduled_date) if inst.scheduled_date else "",
        "actual_date": str(inst.actual_date) if inst.actual_date else None,
        "completed_at": inst.completed_at,
        "lead_installer": inst.lead_installer,
        "crew": inst.crew or [],
        "address": inst.address,
        "site_contact": inst.site_contact,
        "site_phone": inst.site_phone,
        "estimated_hours": float(inst.estimated_hours or 0),
        "actual_hours": float(inst.actual_hours) if inst.actual_hours else None,
        "issues_encountered": inst.issues_encountered,
        "notes": inst.notes,
    }
    if include_project and inst.project:
        d["project_name"] = inst.project.name
    return d


@router.get("/")
async def list_installs(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Install)
    if status:
        query = query.where(Install.status == status.lower())

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(
        query.options(selectinload(Install.project))
        .order_by(Install.scheduled_date.asc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = []
    for inst in result.scalars():
        d = _install_dict(inst, include_project=True)
        if not d.get("project_name"):
            d["project_name"] = "Unknown"
        items.append(d)
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/")
async def create_install(
    project_id: str = Body(...),
    scheduled_date: str = Body(None),
    lead_installer: str = Body(None),
    crew_members: str = Body(""),
    notes: str = Body(None),
    address: str = Body(None),
    site_contact: str = Body(None),
    site_phone: str = Body(None),
    estimated_hours: float = Body(0),
    db: AsyncSession = Depends(get_db),
):
    crew = [m.strip() for m in crew_members.split(",") if m.strip()] if crew_members else []
    inst = Install(
        project_id=project_id,
        scheduled_date=_parse_date(scheduled_date) or date.today(),
        lead_installer=lead_installer,
        notes=notes,
        address=address,
        site_contact=site_contact,
        site_phone=site_phone,
        crew=crew,
        estimated_hours=estimated_hours,
        status="scheduled",
    )
    db.add(inst)
    try:
        await db.commit()
        await db.refresh(inst)
    except Exception as e:
        await db.rollback()
        print(f"[installs] create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    print(f"[installs] created {inst.id} for project {project_id}")
    return {"id": str(inst.id), "status": inst.status, "created": True}


@router.get("/{install_id}")
async def get_install(install_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Install).options(selectinload(Install.project))
        .where(Install.id == install_id)
    )
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Install not found")
    d = _install_dict(inst, include_project=True)
    if not d.get("project_name"):
        d["project_name"] = "Unknown"
    return d


@router.put("/{install_id}")
async def update_install(
    install_id: str,
    status: str = Body(None),
    scheduled_date: str = Body(None),
    actual_date: str = Body(None),
    lead_installer: str = Body(None),
    crew_members: str = Body(None),
    address: str = Body(None),
    site_contact: str = Body(None),
    site_phone: str = Body(None),
    estimated_hours: float = Body(None),
    actual_hours: float = Body(None),
    issues_encountered: str = Body(None),
    notes: str = Body(None),
    completed_at: str = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Install).where(Install.id == install_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Install not found")

    if status is not None:
        inst.status = status.lower()
    if scheduled_date is not None:
        inst.scheduled_date = _parse_date(scheduled_date)
    if actual_date is not None:
        inst.actual_date = _parse_date(actual_date)
    if lead_installer is not None:
        inst.lead_installer = lead_installer
    if crew_members is not None:
        inst.crew = [m.strip() for m in crew_members.split(",") if m.strip()]
    if address is not None:
        inst.address = address
    if site_contact is not None:
        inst.site_contact = site_contact
    if site_phone is not None:
        inst.site_phone = site_phone
    if estimated_hours is not None:
        inst.estimated_hours = estimated_hours
    if actual_hours is not None:
        inst.actual_hours = actual_hours
    if issues_encountered is not None:
        inst.issues_encountered = issues_encountered
    if notes is not None:
        inst.notes = notes
    if completed_at is not None:
        inst.completed_at = completed_at

    try:
        await db.commit()
        await db.refresh(inst)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": str(inst.id), "status": inst.status, "updated": True}


@router.delete("/{install_id}")
async def delete_install(install_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Install).where(Install.id == install_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Install not found")
    await db.delete(inst)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"id": install_id, "deleted": True}
