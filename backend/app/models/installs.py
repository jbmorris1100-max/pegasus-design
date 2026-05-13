"""Pegasus Design — Install Management & QC Models"""
from sqlalchemy import Column, String, Text, Float, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Install(BaseModel):
    __tablename__ = "installs"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    status = Column(String(50), default="scheduled")  # scheduled | in_progress | completed | rescheduled
    scheduled_date = Column(Date, nullable=True)
    actual_date = Column(Date, nullable=True)
    completed_at = Column(String(50), nullable=True)

    lead_installer = Column(String(255), nullable=True)
    crew = Column(ARRAY(String), default=list)
    address = Column(Text, nullable=True)
    site_contact = Column(String(255), nullable=True)
    site_phone = Column(String(50), nullable=True)

    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, nullable=True)
    issues_encountered = Column(Text, nullable=True)
    punch_list = Column(JSONB, nullable=True)  # [{item, status, assigned}]
    notes = Column(Text, nullable=True)

    project = relationship("Project", back_populates="installs")


class QCCheck(BaseModel):
    __tablename__ = "qc_checks"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    checked_by = Column(String(255), nullable=True)
    checked_at = Column(String(50), nullable=True)
    stage = Column(String(100), nullable=True)  # production, assembly, finishing, pre-install
    status = Column(String(50), default="pending")  # pending | passed | failed

    # Structured checklist (JSON array of {check_id, label, result, notes})
    checklist = Column(JSONB, default=list)
    overall_notes = Column(Text, nullable=True)
    failure_reasons = Column(ARRAY(String), default=list)

    project = relationship("Project", back_populates="qc_checks")


class Callback(BaseModel):
    """Post-install callbacks / warranty / service issues."""
    __tablename__ = "callbacks"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    reported_at = Column(String(50), nullable=True)
    reported_by = Column(String(255), nullable=True)
    severity = Column(String(50), default="medium")  # low | medium | high | critical
    status = Column(String(50), default="open")  # open | investigating | resolved | closed
    description = Column(Text, nullable=False)
    resolution = Column(Text, nullable=True)
    resolved_at = Column(String(50), nullable=True)
    labor_hours_spent = Column(Float, default=0.0)
    material_cost = Column(Float, default=0.0)
    root_cause = Column(Text, nullable=True)

    project = relationship("Project", back_populates="callbacks")
