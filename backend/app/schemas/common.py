"""Pegasus Design — Pydantic Schemas (shared)"""
from datetime import datetime, date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel as PydanticBase, Field


# ── Base ────────────────────────────────────────────────────

class BaseSchema(PydanticBase):
    """Shared base with ORM compatibility."""
    model_config = {"from_attributes": True}


class PaginatedResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    items: list


# ── CRM ─────────────────────────────────────────────────────

class ContactSchema(BaseSchema):
    id: Optional[UUID] = None
    customer_id: UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[str] = "false"


class CustomerSummary(BaseSchema):
    id: UUID
    name: str
    type: str
    status: str
    city: Optional[str] = None
    state: Optional[str] = None
    total_projects: int = 0
    total_revenue: float = 0.0
    avg_margin: Optional[float] = None


class CustomerDetail(CustomerSummary):
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    zip_code: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []
    revision_frequency: Optional[float] = None
    last_project_at: Optional[str] = None
    contacts: list[ContactSchema] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Projects ────────────────────────────────────────────────

class ProjectSummary(BaseSchema):
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    name: str
    project_type: str
    status: str
    risk_level: str = "low"
    target_completion: Optional[date] = None
    install_date: Optional[date] = None
    estimated_total: float = 0.0
    margin_actual: Optional[float] = None
    overdue: Optional[str] = "false"
    bottleneck_flag: Optional[str] = "false"


class ProjectDetail(ProjectSummary):
    description: Optional[str] = None
    target_start: Optional[date] = None
    actual_start: Optional[date] = None
    actual_completion: Optional[date] = None
    actual_total: Optional[float] = None
    estimated_labor_hours: float = 0.0
    actual_labor_hours: Optional[float] = None
    estimated_material_cost: float = 0.0
    actual_material_cost: Optional[float] = None
    margin_target: float = 0.40
    revision_count: int = 0
    address: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Estimates ───────────────────────────────────────────────

class EstimateLineItemSchema(BaseSchema):
    id: Optional[UUID] = None
    description: str
    category: Optional[str] = None
    quantity: float = 1.0
    unit: str = "ea"
    unit_price: float = 0.0
    total_price: float = 0.0
    labor_hours: float = 0.0
    material_cost: float = 0.0
    sort_order: int = 0


class EstimateSummary(BaseSchema):
    id: UUID
    customer_id: UUID
    project_id: Optional[UUID] = None
    title: str
    status: str
    revision_number: int = 1
    total: float = 0.0
    estimated_labor_hours: float = 0.0
    target_margin: float = 0.40
    sent_at: Optional[str] = None
    approved_at: Optional[str] = None


# ── Events ──────────────────────────────────────────────────

class EventSchema(BaseSchema):
    id: Optional[UUID] = None
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    actor: Optional[str] = None
    payload: dict = {}
    metadata_json: dict = {}
    severity: str = "info"
    created_at: Optional[datetime] = None


# ── AI ──────────────────────────────────────────────────────

class AIRecommendationSchema(BaseSchema):
    id: Optional[UUID] = None
    title: str
    category: str
    description: str
    reasoning: str
    supporting_data: dict = {}
    confidence: float = 0.5
    expected_impact: str = "medium"
    impact_description: Optional[str] = None
    status: str = "pending"
    requires_approval: Optional[str] = "false"
    ai_mode: str = "observe"
    created_at: Optional[datetime] = None


class DailyBriefSchema(BaseSchema):
    id: Optional[UUID] = None
    date: str
    generated_at: Optional[str] = None
    content: dict = {}
    read_at: Optional[str] = None


# ── Dashboard ───────────────────────────────────────────────

class DashboardSnapshot(BaseSchema):
    """The executive command center data."""
    active_projects: int = 0
    projects_at_risk: int = 0
    overdue_tasks: int = 0
    scheduled_installs: int = 0
    open_callbacks: int = 0
    inventory_alerts: int = 0
    labor_utilization: float = 0.0
    pending_recommendations: int = 0
    margin_health: str = "healthy"  # healthy | warning | critical
    capacity_status: str = "ok"  # ok | warning | critical
    recent_events: list[EventSchema] = []
    top_recommendations: list[AIRecommendationSchema] = []
    at_risk_projects: list[ProjectSummary] = []
    installs_this_week: list[dict] = []


# ── Growth Intelligence ─────────────────────────────────────

class GrowthSignal(BaseSchema):
    signal_type: str  # hiring_pressure, equipment_opportunity, capacity_warning
    description: str
    confidence: float
    recommendation: str
    supporting_data: dict = {}
    urgency: str = "medium"  # low | medium | high | critical


class GrowthForecast(BaseSchema):
    projections: list[dict] = []  # [{month, revenue, projects, labor_needed, capacity_pct}]
    hiring_signals: list[GrowthSignal] = []
    equipment_signals: list[GrowthSignal] = []
    risk_factors: list[str] = []
    summary: str = ""
