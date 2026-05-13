"""Pegasus Design — Estimating API"""
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/")
async def list_estimates(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    """List estimates with filters."""
    return {"total": 0, "page": page, "page_size": page_size, "items": []}


@router.get("/{estimate_id}")
async def get_estimate(estimate_id: str):
    """Get full estimate with line items."""
    return {"id": estimate_id, "title": "Sample Estimate", "line_items": []}


@router.post("/")
async def create_estimate():
    """Create a new estimate from quick-capture or structured input."""
    return {"id": "new-id"}


@router.put("/{estimate_id}")
async def update_estimate(estimate_id: str):
    """Update an estimate."""
    return {"id": estimate_id, "updated": True}


@router.post("/{estimate_id}/approve")
async def approve_estimate(estimate_id: str):
    """Approve an estimate and optionally create/update the linked project."""
    return {"id": estimate_id, "status": "approved"}


@router.post("/{estimate_id}/revise")
async def revise_estimate(estimate_id: str):
    """Create a new revision of an estimate."""
    return {"id": estimate_id, "new_revision_id": "new-rev-id"}


@router.post("/quick-capture")
async def quick_capture_estimate():
    """
    Low-friction estimate creation from minimal input.
    AI infers line items, labor, and material from description.
    """
    return {
        "id": "quick-id",
        "inferred_line_items": [],
        "suggested_total": 0,
        "confidence": 0.85,
    }
