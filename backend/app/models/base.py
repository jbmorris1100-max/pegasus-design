"""Pegasus Design — Core Base Model with Timestamps & Soft Delete"""
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, DateTime, String, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class TimestampMixin:
    """Adds created_at and updated_at columns."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Adds soft-delete support."""
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class BaseModel(Base, TimestampMixin, SoftDeleteMixin):
    """Abstract base for all Pegasus Design models."""
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    created_by = Column(String(255), nullable=True)
    updated_by = Column(String(255), nullable=True)
