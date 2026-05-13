"""Pegasus Design — Dashboard API"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/snapshot")
async def get_dashboard_snapshot():
    """
    Returns the executive command center snapshot:
    - Active projects, at-risk flags, overdue items
    - Scheduled installs, bottlenecks, labor load
    - Material issues, margin risk, callback trends
    - Inventory health, capacity warnings
    - Top AI recommendations
    """
    # In production, this aggregates from all data sources
    return {
        "active_projects": 0,
        "projects_at_risk": 0,
        "overdue_tasks": 0,
        "scheduled_installs": 0,
        "open_callbacks": 0,
        "inventory_alerts": 0,
        "labor_utilization": 0.72,
        "pending_recommendations": 0,
        "margin_health": "healthy",
        "capacity_status": "ok",
        "at_risk_projects": [],
        "installs_this_week": [],
        "recent_events": [],
        "top_recommendations": [],
        "kpis": {
            "weekly_revenue": 0,
            "monthly_margin": 0.0,
            "on_time_delivery_pct": 0.0,
            "callback_rate": 0.0,
            "avg_project_duration_days": 0,
        },
    }


@router.get("/kpis")
async def get_kpis():
    """Key performance indicators for the business."""
    return {
        "revenue": {"current_month": 0, "previous_month": 0, "trend": "flat"},
        "margin": {"average": 0.38, "target": 0.40, "trend": "up"},
        "pipeline": {"leads": 0, "estimating": 0, "approved": 0, "in_production": 0},
        "quality": {"callback_rate": 0.02, "qc_pass_rate": 0.94},
        "capacity": {"utilization": 0.72, "bottleneck": None},
    }
