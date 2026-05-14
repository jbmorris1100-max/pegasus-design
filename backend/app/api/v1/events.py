"""Pegasus Design — Events API (Live Database Queries)"""
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.events import Event

router = APIRouter()

@router.get("/")
async def list_events(
    event_type: Optional[str] = Query(None), entity_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None), page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200), db: AsyncSession = Depends(get_db),
):
    query = select(Event)
    if event_type: query = query.where(Event.event_type == event_type)
    if entity_type: query = query.where(Event.entity_type == entity_type)
    if severity: query = query.where(Event.severity == severity)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.order_by(Event.created_at.desc()).offset((page-1)*page_size).limit(page_size))
    items = [{"id":str(e.id),"event_type":e.event_type,"entity_type":e.entity_type,"entity_id":str(e.entity_id) if e.entity_id else None,"actor":e.actor,"severity":e.severity,"payload":e.payload or {},"created_at":str(e.created_at) if e.created_at else ""} for e in result.scalars()]
    return {"total":total,"page":page,"page_size":page_size,"items":items}

@router.post("/")
async def create_event(
    event_type: str = Body(...), severity: str = Body("info"),
    entity_type: str = Body(None), entity_id: str = Body(None),
    actor: str = Body("user"), description: str = Body(""),
    db: AsyncSession = Depends(get_db),
):
    e = Event(event_type=event_type, entity_type=entity_type, entity_id=entity_id,
              actor=actor, severity=severity, payload={"description": description})
    db.add(e); await db.commit(); await db.refresh(e)
    return {"id":str(e.id),"event_type":e.event_type,"created":True}

@router.get("/recent")
async def get_recent_events(limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).order_by(Event.created_at.desc()).limit(limit))
    events = [{"id":str(e.id),"event_type":e.event_type,"entity_type":e.entity_type,"actor":e.actor,"severity":e.severity,"created_at":str(e.created_at) if e.created_at else ""} for e in result.scalars()]
    return {"events":events}

@router.get("/timeline")
async def get_company_timeline(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    from datetime import date, timedelta
    since = date.today() - timedelta(days=days)
    result = await db.execute(select(Event).where(func.date(Event.created_at) >= since).order_by(Event.created_at.desc()).limit(200))
    events_by_day = {}
    for e in result.scalars():
        day_key = str(e.created_at.date()) if e.created_at else ""
        events_by_day.setdefault(day_key,[]).append({"id":str(e.id),"event_type":e.event_type,"entity_type":e.entity_type,"actor":e.actor,"severity":e.severity})
    return {"days":days,"events_by_day":events_by_day}
