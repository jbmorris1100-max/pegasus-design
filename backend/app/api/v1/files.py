"""Pegasus Design — Unified File Attachments API (Cloudinary-backed)"""
import asyncio
import io
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.files import FileRecord

router = APIRouter()

# ── Cloudinary configuration ──────────────────────────────────────────────────
# Credentials are read at every upload/delete call so a newly-set env var
# takes effect without restarting the process.

ALLOWED_EXT = {"pdf", "png", "jpg", "jpeg", "dwg", "dxf", "docx", "xlsx"}
MAX_BYTES   = 50 * 1024 * 1024  # 50 MB


def _configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name  = os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key     = os.getenv("CLOUDINARY_API_KEY"),
        api_secret  = os.getenv("CLOUDINARY_API_SECRET"),
        secure      = True,
    )


def _cloudinary_resource_type(file_type: Optional[str]) -> str:
    """Map our file extension to a Cloudinary resource_type string."""
    if file_type in {"png", "jpg", "jpeg", "gif", "webp"}:
        return "image"
    # pdf, dwg, dxf, docx, xlsx → raw
    return "raw"


# ── Legacy URL resolver ───────────────────────────────────────────────────────
# Older records stored relative /uploads/... paths or Railway-domain full URLs.
# New records store Cloudinary https:// URLs directly.
# This normaliser ensures the API always returns a usable full URL.

def _resolve_file_url(raw_url: str) -> str:
    if not raw_url:
        return raw_url
    if raw_url.startswith("http"):
        return raw_url
    # Legacy relative path — best-effort resolve via known Railway domain
    domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "pegasus-design-production.up.railway.app")
    return f"https://{domain}{raw_url}"


# ── Serialiser ────────────────────────────────────────────────────────────────

def _file_dict(f: FileRecord) -> dict:
    source = "project" if f.project_id else "estimate" if f.estimate_id else "crm"
    return {
        "id":                    str(f.id),
        "customer_id":           str(f.customer_id),
        "project_id":            str(f.project_id)  if f.project_id  else None,
        "estimate_id":           str(f.estimate_id) if f.estimate_id else None,
        "filename":              f.filename,
        "display_name":          f.display_name or f.filename,
        "file_url":              _resolve_file_url(f.file_url),
        "cloudinary_public_id":  f.cloudinary_public_id,
        "file_type":             f.file_type,
        "file_size":             f.file_size,
        "category":              f.category or "other",
        "uploaded_by":           f.uploaded_by,
        "source":                source,
        "created_at":            f.created_at.isoformat() if f.created_at else None,
    }


# ── Upload ────────────────────────────────────────────────────────────────────

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

    _configure_cloudinary()
    public_id = f"{uuid.uuid4().hex}_{file.filename}"

    try:
        # Run the synchronous Cloudinary SDK call in a thread so we don't
        # block the async event loop during the network upload.
        upload_result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            io.BytesIO(content),
            folder         = f"pegasus/{customer_id}",
            public_id      = public_id,
            resource_type  = "auto",
            use_filename   = False,
            unique_filename= False,
        )
    except Exception as exc:
        print(f"[files] Cloudinary upload error: {exc}")
        raise HTTPException(500, f"File upload failed: {exc}")

    file_url             = upload_result["secure_url"]
    cloudinary_public_id = upload_result["public_id"]
    print(f"[files] uploaded → {file_url}  (public_id={cloudinary_public_id})")

    record = FileRecord(
        customer_id          = customer_id,
        project_id           = project_id  or None,
        estimate_id          = estimate_id or None,
        filename             = file.filename,
        display_name         = display_name or file.filename,
        file_url             = file_url,
        cloudinary_public_id = cloudinary_public_id,
        file_type            = ext,
        file_size            = len(content),
        category             = category,
        uploaded_by          = uploaded_by,
    )
    db.add(record)
    try:
        await db.commit()
        await db.refresh(record)
    except Exception as exc:
        await db.rollback()
        # Best-effort Cloudinary cleanup if DB write failed
        try:
            await asyncio.to_thread(
                cloudinary.uploader.destroy,
                cloudinary_public_id,
                resource_type=_cloudinary_resource_type(ext),
            )
        except Exception:
            pass
        raise HTTPException(500, str(exc))

    return _file_dict(record)


# ── Read endpoints ────────────────────────────────────────────────────────────

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


# ── Update ────────────────────────────────────────────────────────────────────

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
    except Exception as exc:
        await db.rollback()
        raise HTTPException(500, str(exc))
    return _file_dict(f)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/cleanup-old-records")
async def cleanup_old_records(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete as sa_delete
    result = await db.execute(
        sa_delete(FileRecord).where(FileRecord.file_url.contains("/uploads/"))
    )
    await db.commit()
    deleted = result.rowcount
    print(f"[files] cleanup-old-records: deleted {deleted} stale records")
    return {"deleted": deleted, "message": f"Removed {deleted} stale local-path file record(s)"}


@router.delete("/{file_id}")
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FileRecord).where(FileRecord.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "File not found")

    # Soft-delete in DB first
    f.deleted_at = datetime.now(timezone.utc)
    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(500, str(exc))

    # Delete from Cloudinary if the record has a public_id
    if f.cloudinary_public_id:
        _configure_cloudinary()
        resource_type = _cloudinary_resource_type(f.file_type)
        try:
            await asyncio.to_thread(
                cloudinary.uploader.destroy,
                f.cloudinary_public_id,
                resource_type=resource_type,
            )
            print(f"[files] deleted from Cloudinary: {f.cloudinary_public_id}")
        except Exception as exc:
            # Non-fatal — the DB record is already soft-deleted
            print(f"[files] Cloudinary delete failed (non-fatal): {exc}")

    return {"id": file_id, "deleted": True}
