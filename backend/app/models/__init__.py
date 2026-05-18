"""Pegasus Design — All Models"""
from app.models.base import BaseModel, Base
from app.models.crm import Customer, Contact, CustomerType, CustomerStatus
from app.models.projects import Project, JobTask, ProjectStatus, ProjectType
from app.models.estimating import Estimate, EstimateLineItem, EstimateStatus
from app.models.scheduling import (
    ScheduleBlock, ScheduleBlockType,
    CapacitySnapshot, InventoryItem, PurchaseOrder, PurchaseOrderItem,
)
from app.models.installs import Install, QCCheck, Callback
from app.models.events import Event, AIRecommendation, Notification, DailyBrief
from app.models.users import User, AuditLog, InlineIQLaborEntry, InlineIQSyncLog
from app.models.files import FileRecord, Message

__all__ = [
    "BaseModel", "Base",
    # CRM
    "Customer", "Contact", "CustomerType", "CustomerStatus",
    # Projects
    "Project", "JobTask", "ProjectStatus", "ProjectType",
    # Estimating
    "Estimate", "EstimateLineItem", "EstimateStatus",
    # Scheduling & Inventory
    "ScheduleBlock", "ScheduleBlockType", "CapacitySnapshot",
    "InventoryItem", "PurchaseOrder", "PurchaseOrderItem",
    # Installs & QC
    "Install", "QCCheck", "Callback",
    # Events & AI
    "Event", "AIRecommendation", "Notification", "DailyBrief",
    # Users & Integration
    "User", "AuditLog", "InlineIQLaborEntry", "InlineIQSyncLog",
    # Files & Messages
    "FileRecord", "Message",
]
