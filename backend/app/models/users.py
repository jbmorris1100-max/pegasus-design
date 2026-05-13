"""Pegasus Design — User, Role & InlineIQ Integration Models"""
from sqlalchemy import Column, String, Text, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(50), default="craftsman")  # owner | manager | lead | craftsman | estimator | installer
    is_active = Column(String(5), default="true")
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    last_login = Column(String(50), nullable=True)
    permissions = Column(ARRAY(String), default=list)
    notifications_enabled = Column(String(5), default="true")


class AuditLog(BaseModel):
    """Immutable audit trail for compliance and traceability."""
    __tablename__ = "audit_logs"

    user_id = Column(String(255), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)  # create, update, delete, approve, export
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    changes = Column(JSONB, default=dict)  # {field: {old: ..., new: ...}}
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)


# ── InlineIQ Integration ────────────────────────────────────────

class InlineIQLaborEntry(BaseModel):
    """Labor tracking data synced from InlineIQ."""
    __tablename__ = "inlineiq_labor_entries"

    inlineiq_id = Column(String(255), unique=True, nullable=True)
    user_id = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)
    project_reference = Column(String(255), nullable=True)
    task_description = Column(Text, nullable=True)
    department = Column(String(100), nullable=True)
    start_time = Column(String(50), nullable=False)
    end_time = Column(String(50), nullable=True)
    hours = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    synced_at = Column(String(50), nullable=True)


class InlineIQSyncLog(BaseModel):
    """Tracking log for InlineIQ sync operations."""
    __tablename__ = "inlineiq_sync_logs"

    sync_type = Column(String(100), nullable=False)  # labor, inventory, damage_report, etc.
    status = Column(String(50), default="pending")  # pending | success | failed
    records_processed = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    started_at = Column(String(50), nullable=True)
    completed_at = Column(String(50), nullable=True)
    error_log = Column(JSONB, default=list)
    summary = Column(Text, nullable=True)
