"""Pegasus Design — Event System & AI Recommendation Models"""
from sqlalchemy import Column, String, Text, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Event(BaseModel):
    """Every meaningful business action is recorded as an event for audit, learning, and forecasting."""
    __tablename__ = "events"

    event_type = Column(String(100), nullable=False)  # EstimateCreated, RevisionRequested, etc.
    entity_type = Column(String(100), nullable=True)  # customer, project, estimate, install, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    actor = Column(String(255), nullable=True)  # Who performed the action
    payload = Column(JSONB, default=dict)  # Event-specific data
    metadata_json = Column(JSONB, default=dict)  # Additional context
    severity = Column(String(50), default="info")  # info | warning | critical
    related_entity_type = Column(String(100), nullable=True)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)


class AIRecommendation(BaseModel):
    """AI-generated recommendations with reasoning, confidence, and impact."""
    __tablename__ = "ai_recommendations"

    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # margin, capacity, hiring, equipment, quality, growth
    description = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=False)
    supporting_data = Column(JSONB, default=dict)  # Data that backs this recommendation
    confidence = Column(Float, default=0.5)  # 0.0 - 1.0
    expected_impact = Column(String(50), default="medium")  # low | medium | high | critical
    impact_description = Column(Text, nullable=True)

    status = Column(String(50), default="pending")  # pending | accepted | dismissed | implemented
    requires_approval = Column(String(5), default="false")
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(String(50), nullable=True)

    # Links to related entities
    related_project_id = Column(UUID(as_uuid=True), nullable=True)
    related_customer_id = Column(UUID(as_uuid=True), nullable=True)

    # AI mode that generated this
    ai_mode = Column(String(50), default="observe")  # observe | assist | automate


class Notification(BaseModel):
    """User-facing notifications and alerts."""
    __tablename__ = "notifications"

    user_id = Column(String(255), nullable=True)  # null = all users
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # risk, milestone, reminder, system, ai_recommendation
    severity = Column(String(50), default="info")  # info | warning | critical
    read_at = Column(String(50), nullable=True)
    action_url = Column(String(500), nullable=True)  # Deep link to relevant screen
    source_event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=True)
    metadata_json = Column(JSONB, default=dict)


class DailyBrief(BaseModel):
    """AI-generated morning brief — the day's operational snapshot."""
    __tablename__ = "daily_briefs"

    date = Column(String(50), nullable=False)
    generated_at = Column(String(50), nullable=True)
    content = Column(JSONB, default=dict)
    # {
    #   "summary": "...",
    #   "active_projects": [...],
    #   "scheduled_installs": [...],
    #   "at_risk": [...],
    #   "bottlenecks": [...],
    #   "recommendations": [...],
    #   "kpis": {...}
    # }
    read_at = Column(String(50), nullable=True)
