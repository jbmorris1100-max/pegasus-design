"""Pegasus Design — Reports API (Job Costing, etc.)"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.models.projects import Project
from app.models.crm import Customer

router = APIRouter()


def _ev(val):
    return val.value if hasattr(val, "value") else val


@router.get("/job-costing")
async def job_costing_report(
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """All projects with customer name, financials, and variance fields."""
    query = (
        select(Project, Customer.name.label("customer_name"))
        .join(Customer, Project.customer_id == Customer.id, isouter=True)
    )
    if status:
        query = query.where(Project.status == status.lower())
    if customer_id:
        query = query.where(Project.customer_id == customer_id)

    result = await db.execute(query.order_by(Project.updated_at.desc()))

    projects = []
    total_revenue = 0.0
    total_labor_hours = 0.0
    total_material_cost = 0.0
    margin_values = []

    for row in result:
        p: Project = row[0]
        customer_name: str = row[1] or "Unknown"

        est_total = float(p.estimated_total or 0)
        act_total = float(p.actual_total) if p.actual_total is not None else None
        variance  = (act_total - est_total) if act_total is not None else None

        est_margin_pct = float(p.margin_target or 0.40) * 100
        act_margin_pct = float(p.margin_actual) * 100 if p.margin_actual is not None else None

        est_labor = float(p.estimated_labor_hours or 0)
        act_labor = float(p.actual_labor_hours) if p.actual_labor_hours is not None else None

        est_material = float(p.estimated_material_cost or 0)
        act_material = float(p.actual_material_cost) if p.actual_material_cost is not None else None

        total_revenue       += act_total or 0
        total_labor_hours   += act_labor or 0
        total_material_cost += act_material or 0
        if p.margin_actual is not None:
            margin_values.append(float(p.margin_actual))

        projects.append({
            "id":                     str(p.id),
            "name":                   p.name,
            "customer_name":          customer_name,
            "customer_id":            str(p.customer_id) if p.customer_id else "",
            "status":                 _ev(p.status),
            "target_completion":      str(p.target_completion) if p.target_completion else None,
            "estimated_total":        est_total,
            "actual_total":           act_total,
            "variance":               variance,
            "over_budget":            (variance > 0) if variance is not None else None,
            "estimated_margin_pct":   est_margin_pct,
            "actual_margin_pct":      act_margin_pct,
            "estimated_labor_hours":  est_labor,
            "actual_labor_hours":     act_labor,
            "estimated_material_cost": est_material,
            "actual_material_cost":   act_material,
        })

    avg_margin_pct = (sum(margin_values) / len(margin_values) * 100) if margin_values else None

    return {
        "summary": {
            "total_revenue":      total_revenue,
            "avg_margin_pct":     avg_margin_pct,
            "total_labor_hours":  total_labor_hours,
            "total_material_cost": total_material_cost,
            "project_count":      len(projects),
        },
        "projects": projects,
    }
