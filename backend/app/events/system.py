"""Pegasus Design — Event System Service

Every meaningful business action emits an event. Events drive:
- Audit trails
- AI learning & baseline building
- Real-time notifications
- Timeline construction
- Forecasting models
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.models.events import Event, Notification
from app.core.database import async_session_factory


class EventSystem:
    """Central event emission and processing service."""

    # Known event types for validation and discovery
    EVENT_TYPES = {
        # CRM
        "CustomerCreated", "CustomerUpdated", "ContactAdded",
        # Estimating
        "EstimateCreated", "EstimateSent", "EstimateApproved",
        "EstimateRevised", "EstimateDeclined",
        # Projects
        "ProjectCreated", "ProjectStatusChanged", "ProjectCompleted",
        "ProjectOnHold", "ProjectOverdue",
        # Production (from InlineIQ)
        "ProductionStarted", "ProductionCompleted", "LaborTracked",
        "MaterialUsed", "QCPassed", "QCFailed",
        # Scheduling
        "ScheduleBlockCreated", "ScheduleConflict", "CapacityWarning",
        # Inventory
        "InventoryLow", "MaterialOrdered", "MaterialReceived",
        # Installs
        "InstallScheduled", "InstallCompleted", "InstallIssue",
        # Callbacks
        "CallbackLogged", "CallbackResolved",
        # AI
        "RecommendationGenerated", "RecommendationAccepted",
        "BottleneckDetected", "MarginRiskDetected",
        "GrowthSignalDetected", "EquipmentUpgradeSuggested",
        # System
        "DailyBriefGenerated", "DataSyncCompleted",
    }

    @staticmethod
    async def emit(
        event_type: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        actor: Optional[str] = None,
        payload: dict = None,
        metadata: dict = None,
        severity: str = "info",
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[UUID] = None,
        notify_users: list[str] = None,
    ) -> Event:
        """Emit a new event to the system."""
        async with async_session_factory() as session:
            event = Event(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=entity_id,
                actor=actor or "system",
                payload=payload or {},
                metadata_json=metadata or {},
                severity=severity,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
            )
            session.add(event)
            await session.commit()
            await session.refresh(event)

            # If notification requested, create it
            if notify_users:
                for user_id in notify_users:
                    notif = Notification(
                        user_id=user_id,
                        title=f"{event_type}",
                        body=EventSystem._build_notification_body(event_type, payload),
                        category=EventSystem._categorize_event(event_type),
                        severity=severity,
                        source_event_id=event.id,
                        metadata_json={"event_type": event_type, "entity_type": entity_type},
                    )
                    session.add(notif)
                await session.commit()

            return event

    @staticmethod
    def _build_notification_body(event_type: str, payload: dict) -> str:
        """Build a human-readable notification body from event data."""
        templates = {
            "EstimateApproved": f"Estimate approved: {payload.get('title', 'Unknown')}",
            "ProjectOverdue": f"Project overdue: {payload.get('project_name', 'Unknown')}",
            "InventoryLow": f"Low inventory: {payload.get('item_name', 'Unknown')}",
            "QCFailed": f"QC failed: {payload.get('project_name', 'Unknown')}",
            "BottleneckDetected": f"Bottleneck detected in {payload.get('department', 'Unknown')}",
            "CapacityWarning": "Production capacity is approaching limits.",
            "GrowthSignalDetected": "Growth signal detected — review recommended.",
        }
        return templates.get(event_type, f"{event_type} occurred.")

    @staticmethod
    def _categorize_event(event_type: str) -> str:
        """Map event type to notification category."""
        risk_events = {"ProjectOverdue", "QCFailed", "BottleneckDetected", "CapacityWarning", "MarginRiskDetected"}
        milestone_events = {"EstimateApproved", "ProjectCompleted", "InstallCompleted"}
        system_events = {"DailyBriefGenerated", "DataSyncCompleted"}

        if event_type in risk_events:
            return "risk"
        elif event_type in milestone_events:
            return "milestone"
        elif event_type in system_events:
            return "system"
        return "info"
