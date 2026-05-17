"""Pegasus Design — CRM Models: Customers, Contacts, Relationships"""
from sqlalchemy import Column, String, Text, Enum, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class CustomerType(str, enum.Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    DESIGNER = "designer"
    CONTRACTOR = "contractor"
    ARCHITECT = "architect"


class CustomerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    LEAD = "lead"
    ARCHIVED = "archived"


class Customer(BaseModel):
    __tablename__ = "customers"

    name = Column(String(255), nullable=False)
    type = Column(Enum(CustomerType, values_callable=lambda x: [e.value for e in x]), default=CustomerType.RESIDENTIAL, nullable=False)
    status = Column(Enum(CustomerStatus, values_callable=lambda x: [e.value for e in x]), default=CustomerStatus.LEAD, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(ARRAY(String), default=list)

    # Metrics (updated by AI/event processing)
    total_projects = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    avg_margin = Column(Float, nullable=True)
    revision_frequency = Column(Float, nullable=True)  # avg revisions per project
    last_project_at = Column(String(50), nullable=True)

    # Relationships
    contacts = relationship("Contact", back_populates="customer", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="customer")
    estimates = relationship("Estimate", back_populates="customer")


class Contact(BaseModel):
    __tablename__ = "contacts"

    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    role = Column(String(100), nullable=True)  # e.g. "Homeowner", "Project Manager"
    is_primary = Column(String(5), default="false")
    notes = Column(Text, nullable=True)

    customer = relationship("Customer", back_populates="contacts")
