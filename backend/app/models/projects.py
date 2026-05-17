"""Pegasus Design — Project & Job Models"""
from sqlalchemy import Column, String, Text, Enum, Float, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class ProjectStatus(str, enum.Enum):
    LEAD = "lead"
    ESTIMATING = "estimating"
    ESTIMATE_SENT = "estimate_sent"
    APPROVED = "approved"
    IN_PRODUCTION = "in_production"
    FINISHING = "finishing"
    READY_FOR_INSTALL = "ready_for_install"
    INSTALLING = "installing"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class ProjectType(str, enum.Enum):
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    BUILT_IN = "built_in"
    CLOSET = "closet"
    LAUNDRY = "laundry"
    HOME_OFFICE = "home_office"
    ENTERTAINMENT = "entertainment"
    COMMERCIAL = "commercial"
    CUSTOM_MILLWORK = "custom_millwork"
    OTHER = "other"


class Project(BaseModel):
    __tablename__ = "projects"

    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(Enum(ProjectType, values_callable=lambda x: [e.value for e in x]), default=ProjectType.OTHER, nullable=False)
    status = Column(Enum(ProjectStatus, values_callable=lambda x: [e.value for e in x]), default=ProjectStatus.LEAD, nullable=False)

    # Dates
    target_start = Column(Date, nullable=True)
    target_completion = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_completion = Column(Date, nullable=True)
    install_date = Column(Date, nullable=True)

    # Financial
    estimated_total = Column(Float, default=0.0)
    actual_total = Column(Float, nullable=True)
    estimated_labor_hours = Column(Float, default=0.0)
    actual_labor_hours = Column(Float, nullable=True)
    estimated_material_cost = Column(Float, default=0.0)
    actual_material_cost = Column(Float, nullable=True)
    margin_target = Column(Float, default=0.40)  # 40% target margin
    margin_actual = Column(Float, nullable=True)

    # Risk & flags
    risk_level = Column(String(20), default="low")  # low | medium | high | critical
    overdue = Column(String(5), default="false")
    revision_count = Column(Integer, default=0)
    bottleneck_flag = Column(String(5), default="false")

    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(ARRAY(String), default=list)

    # Relationships
    customer = relationship("Customer", back_populates="projects")
    estimates = relationship("Estimate", back_populates="project")
    tasks = relationship("JobTask", back_populates="project", cascade="all, delete-orphan")
    installs = relationship("Install", back_populates="project", cascade="all, delete-orphan")
    qc_checks = relationship("QCCheck", back_populates="project", cascade="all, delete-orphan")
    callbacks = relationship("Callback", back_populates="project", cascade="all, delete-orphan")


class JobTask(BaseModel):
    """Individual production tasks within a project."""
    __tablename__ = "job_tasks"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending | in_progress | complete | blocked
    assigned_to = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)  # Production, Assembly, Finishing
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, nullable=True)
    sort_order = Column(Integer, default=0)
    due_date = Column(Date, nullable=True)
    completed_at = Column(String(50), nullable=True)

    project = relationship("Project", back_populates="tasks")
