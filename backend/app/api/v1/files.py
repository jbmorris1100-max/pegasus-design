"""Pegasus Design — Unified File Attachments API"""
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, Body
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.files import FileRecord

router = APIRouter()

UPLOADS_DIR    = os.getenv("UPLOADS_DIR", "/app/uploads")
ALLOWED_EXT    = {"pdf", "png", "jpg", "jpeg", "dwg", "dxf", "docx", "xlsx"}
MAX_BYTES      = 50 * 1024 * 1024  # 50 MB

# Build file URLs as fully-qualified public URLs when the Railway domain is available.
# Falls back to a relative path (works for local dev via same-origin serving).
_RAILWAY_DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")


def _build_file_url(customer_id: str, filename: str) -> str:
    if _RAILWAY_DOMAIN:
        return f"https://{_RAILWAY_DOMAIN}/uploads/{customer_id}/{filename}"
    return f"/uploads/{customer_id}/{filename}"


def _disk_path_from_url(file_url: str) -> str:
    """Extract the filesystem path from either a full URL or a relative /uploads/... path."""
    if file_url.startswith("http"):
        from urllib.parse import urlparse
        path = urlparse(file_url).path          # "/uploads/{cid}/{name}"
    else:
        path = file_url                          # "/uploads/{cid}/{name}"
    relative = path.split("/uploads", 1)[-1]    # "/{cid}/{name}"
    return UPLOADS_DIR + relative


def _file_dict(f: FileRecord) -> dict:
    source = "project" if f.project_id else "estimate" if f.estimate_id else "crm"
    return {
        "id":           str(f.id),
        "customer_id":  str(f.customer_id),
        "project_id":   str(f.project_id)  if f.project_id  else None,
        "estimate_id":  str(f.estimate_id) if f.estimate_id else None,
        "filename":     f.filename,
        "display_name": f.display_name or f.filename,
        "file_url":     f.file_url,
        "file_type":    f.file_type,
        "file_size":    f.file_size,
        "category":     f.category or "other",
        "uploaded_by":  f.uploaded_by,
        "source":       source,
        "created_at":   f.created_at.isoformat() if f.created_at else None,
    }


@router.post("/upload")
async def upload_file(
    file:         UploadFile = File(...),
    customer_id:  str = Form(...),
    project_id:   Optional[str] = Form(None),
    estimate_id:  Optional[str] = Form(None),
    category:     str = Form("other"),
    display_name: Optional[str] = Form(None),
    uploaded_by:  str = Form("staff"),
    db: AsyncSession = Depends(get_db),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type '.{ext}' not allowed. Accepted: {', '.join(sorted(ALLOWED_EXT))}")

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(400, "File exceeds the 50 MB limit")

    # Persist to disk
    cust_dir = os.path.join(UPLOADS_DIR, customer_id)
    os.makedirs(cust_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    disk_path   = os.path.join(cust_dir, unique_name)
    with open(disk_path, "wb") as fh:
        fh.write(content)

    file_url = _build_file_url(customer_id, unique_name)

    record = FileRecord(
        customer_id  = customer_id,
        project_id   = project_id  or None,
        estimate_id  = estimate_id or None,
        filename     = file.filename,
        display_name = display_name or file.filename,
        file_url     = file_url,
        file_type    = ext,
        file_size    = len(content),
        category     = category,
        uploaded_by  = uploaded_by,
    )
    db.add(record)
    try:
        await db.commit()
        await db.refresh(record)
    except Exception as e:
        await db.rollback()
        if os.path.exists(disk_path):
            os.remove(disk_path)
        raise HTTPException(500, str(e))

    return _file_dict(record)


@router.get("/customer/{customer_id}")
async def get_customer_files(
    customer_id: str,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(FileRecord).where(
        and_(FileRecord.customer_id == customer_id, FileRecord.deleted_at.is_(None))
    )
    if category and category != "all":
        q = q.where(FileRecord.category == category)
    result = await db.execute(q.order_by(FileRecord.created_at.desc()))
    return {"items": [_file_dict(f) for f in result.scalars()]}


@router.get("/project/{project_id}")
async def get_project_files(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FileRecord).where(
            and_(FileRecord.project_id == project_id, FileRecord.deleted_at.is_(None))
        ).order_by(FileRecord.created_at.desc())
    )
    return {"items": [_file_dict(f) for f in result.scalars()]}


@router.get("/estimate/{estimate_id}")
async def get_estimate_files(estimate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FileRecord).where(
            and_(FileRecord.estimate_id == estimate_id, FileRecord.deleted_at.is_(None))
        ).order_by(FileRecord.created_at.desc())
    )
    return {"items": [_file_dict(f) for f in result.scalars()]}


@router.put("/{file_id}")
async def update_file(
    file_id:      str,
    display_name: Optional[str] = Body(None),
    category:     Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FileRecord).where(FileRecord.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "File not found")
    if display_name is not None:
        f.display_name = display_name
    if category is not None:
        f.category = category
    try:
        await db.commit()
        await db.refresh(f)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
    return _file_dict(f)


@router.delete("/{file_id}")
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FileRecord).where(FileRecord.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "File not found")

    # Soft-delete in DB
    f.deleted_at = datetime.now(timezone.utc)

    # Remove physical file (handles both full URLs and legacy relative paths)
    disk_path = _disk_path_from_url(f.file_url)
    if os.path.exists(disk_path):
        try:
            os.remove(disk_path)
        except OSError:
            pass

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, str(e))
    return {"id": file_id, "deleted": True}
