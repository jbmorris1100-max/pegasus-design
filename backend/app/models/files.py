"""Pegasus Design — File Attachments + Client Messages"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class FileRecord(BaseModel):
    """Unified file attachment — belongs to a customer, optionally linked to a project or estimate."""
    __tablename__ = "files"

    customer_id  = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    project_id   = Column(UUID(as_uuid=True), ForeignKey("projects.id"),  nullable=True)
    estimate_id  = Column(UUID(as_uuid=True), ForeignKey("estimates.id"), nullable=True)

    filename     = Column(String(500), nullable=False)
    display_name = Column(String(500), nullable=True)
    file_url     = Column(String(1000), nullable=False)
    file_type    = Column(String(50),  nullable=True)  # pdf, png, jpg, dwg …
    file_size    = Column(Integer,     nullable=True)  # bytes
    category     = Column(String(100), nullable=True)  # plan | contract | estimate | photo | spec | other
    uploaded_by  = Column(String(255), nullable=True)

    customer = relationship("Customer", back_populates="files")
    project  = relationship("Project")
    estimate = relationship("Estimate")


class Message(BaseModel):
    """Client–company message thread scoped to a customer."""
    __tablename__ = "messages"

    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    sender      = Column(String(50), nullable=False)  # "client" | "company"
    message     = Column(Text, nullable=False)
    read_at     = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("Customer", back_populates="messages")
