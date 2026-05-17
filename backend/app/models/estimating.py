"""Pegasus Design — Estimating Models"""
from sqlalchemy import Column, String, Text, Enum, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class EstimateStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    APPROVED = "approved"
    REVISED = "revised"
    DECLINED = "declined"
    EXPIRED = "expired"


class Estimate(BaseModel):
    __tablename__ = "estimates"

    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(Enum(EstimateStatus, values_callable=lambda x: [e.value for e in x]), default=EstimateStatus.DRAFT, nullable=False)
    revision_number = Column(Integer, default=1)

    # Financial
    subtotal = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    estimated_labor_hours = Column(Float, default=0.0)
    estimated_material_cost = Column(Float, default=0.0)
    target_margin = Column(Float, default=0.40)

    # Dates
    sent_at = Column(String(50), nullable=True)
    approved_at = Column(String(50), nullable=True)
    expires_at = Column(String(50), nullable=True)

    # Content
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    raw_input = Column(JSONB, nullable=True)  # Original quick-capture data

    # Relationships
    customer = relationship("Customer", back_populates="estimates")
    project = relationship("Project", back_populates="estimates")
    line_items = relationship("EstimateLineItem", back_populates="estimate", cascade="all, delete-orphan")


class EstimateLineItem(BaseModel):
    __tablename__ = "estimate_line_items"

    estimate_id = Column(UUID(as_uuid=True), ForeignKey("estimates.id"), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # cabinets, millwork, hardware, finishing, install
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="ea")  # ea, lf, sf, set
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    labor_hours = Column(Float, default=0.0)
    material_cost = Column(Float, default=0.0)
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    estimate = relationship("Estimate", back_populates="line_items")
