"""Pegasus Design — Scheduling, Capacity & Inventory Models"""
from sqlalchemy import Column, String, Text, Enum, Float, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class ScheduleBlockType(str, enum.Enum):
    PRODUCTION = "production"
    ASSEMBLY = "assembly"
    FINISHING = "finishing"
    INSTALL = "install"
    MAINTENANCE = "maintenance"
    TRAINING = "training"
    TIME_OFF = "time_off"


class ScheduleBlock(BaseModel):
    __tablename__ = "schedule_blocks"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    block_type = Column(Enum(ScheduleBlockType), default=ScheduleBlockType.PRODUCTION, nullable=False)
    assigned_to = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, nullable=True)
    status = Column(String(50), default="scheduled")  # scheduled | in_progress | complete | cancelled

    notes = Column(Text, nullable=True)
    dependencies = Column(ARRAY(UUID), default=list)  # IDs of blocks this depends on


class CapacitySnapshot(BaseModel):
    """Daily snapshot of production capacity for trending & forecasting."""
    __tablename__ = "capacity_snapshots"

    date = Column(Date, nullable=False, unique=True)
    total_labor_hours_available = Column(Float, default=0.0)
    total_labor_hours_used = Column(Float, default=0.0)
    active_projects = Column(Integer, default=0)
    completions = Column(Integer, default=0)
    new_starts = Column(Integer, default=0)
    bottleneck_department = Column(String(100), nullable=True)
    utilization_pct = Column(Float, nullable=True)  # 0.0 - 1.0
    notes = Column(Text, nullable=True)


# ── Inventory & Purchasing ─────────────────────────────────────────────

class InventoryItem(BaseModel):
    __tablename__ = "inventory_items"

    name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)  # sheet_goods, hardwood, hardware, finishing, supplies
    unit = Column(String(50), default="ea")

    quantity_on_hand = Column(Float, default=0.0)
    reorder_point = Column(Float, nullable=True)
    reorder_quantity = Column(Float, nullable=True)
    unit_cost = Column(Float, default=0.0)
    supplier = Column(String(255), nullable=True)
    supplier_sku = Column(String(100), nullable=True)
    lead_time_days = Column(Integer, nullable=True)
    low_stock_alert = Column(String(5), default="false")
    notes = Column(Text, nullable=True)


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"

    supplier = Column(String(255), nullable=False)
    status = Column(String(50), default="draft")  # draft | sent | confirmed | received | cancelled
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    total = Column(Float, default=0.0)
    ordered_at = Column(String(50), nullable=True)
    expected_at = Column(String(50), nullable=True)
    received_at = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(BaseModel):
    __tablename__ = "purchase_order_items"

    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=True)
    description = Column(Text, nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="ea")
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
