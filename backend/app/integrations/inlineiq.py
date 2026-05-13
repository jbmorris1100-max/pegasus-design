"""Pegasus Design — InlineIQ Integration Service

Connects to the InlineIQ production-floor telemetry system to pull:
- Labor tracking data
- Production status updates
- Damage reports
- Inventory needs
- Crew activity
"""
from datetime import datetime
from typing import Optional

import httpx
from app.core.config import get_settings
from app.models.users import InlineIQLaborEntry, InlineIQSyncLog
from app.core.database import async_session_factory
from app.events.system import EventSystem


class InlineIQService:
    """Service for syncing data from InlineIQ into Pegasus Design."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.inlineiq_api_url
        self.api_key = settings.inlineiq_api_key
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=30.0,
        )

    async def sync_labor_entries(self, since: Optional[str] = None) -> int:
        """Pull labor entries from InlineIQ and upsert into Pegasus DB."""
        if not self.base_url:
            return 0

        sync_log = await self._start_sync("labor")
        records_processed = 0

        try:
            # Fetch from InlineIQ
            params = {"since": since} if since else {}
            response = await self.client.get("/api/labor/entries", params=params)
            response.raise_for_status()
            entries = response.json().get("data", [])

            async with async_session_factory() as session:
                for entry_data in entries:
                    # Upsert by inlineiq_id
                    existing = None
                    if entry_data.get("id"):
                        from sqlalchemy import select
                        result = await session.execute(
                            select(InlineIQLaborEntry).where(
                                InlineIQLaborEntry.inlineiq_id == str(entry_data["id"])
                            )
                        )
                        existing = result.scalar_one_or_none()

                    if existing:
                        # Update
                        existing.hours = entry_data.get("hours", existing.hours)
                        existing.end_time = entry_data.get("end_time", existing.end_time)
                        existing.notes = entry_data.get("notes", existing.notes)
                    else:
                        # Create
                        entry = InlineIQLaborEntry(
                            inlineiq_id=str(entry_data.get("id")),
                            user_id=str(entry_data.get("user_id", "")),
                            user_name=entry_data.get("user_name", ""),
                            project_reference=entry_data.get("project_ref", ""),
                            task_description=entry_data.get("task", ""),
                            department=entry_data.get("department", ""),
                            start_time=entry_data.get("start_time", datetime.now().isoformat()),
                            end_time=entry_data.get("end_time"),
                            hours=entry_data.get("hours", 0.0),
                            notes=entry_data.get("notes", ""),
                            synced_at=datetime.now().isoformat(),
                        )
                        session.add(entry)

                        # Emit event for each new labor entry
                        await EventSystem.emit(
                            event_type="LaborTracked",
                            entity_type="labor_entry",
                            actor=entry.user_name,
                            payload={
                                "user_name": entry.user_name,
                                "hours": entry.hours,
                                "department": entry.department,
                                "project_reference": entry.project_reference,
                            },
                        )

                    records_processed += 1

                await session.commit()

            await self._complete_sync(sync_log, "success", records_processed)
            return records_processed

        except Exception as e:
            await self._complete_sync(sync_log, "failed", records_processed, str(e))
            raise

    async def _start_sync(self, sync_type: str) -> InlineIQSyncLog:
        """Create a sync log entry."""
        async with async_session_factory() as session:
            log = InlineIQSyncLog(
                sync_type=sync_type,
                status="pending",
                started_at=datetime.now().isoformat(),
            )
            session.add(log)
            await session.commit()
            await session.refresh(log)
            return log

    async def _complete_sync(
        self, sync_log: InlineIQSyncLog, status: str, processed: int, error: str = None
    ):
        """Update sync log with completion status."""
        async with async_session_factory() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(InlineIQSyncLog).where(InlineIQSyncLog.id == sync_log.id)
            )
            log = result.scalar_one_or_none()
            if log:
                log.status = status
                log.records_processed = processed
                log.completed_at = datetime.now().isoformat()
                if error:
                    log.error_log = [error]
                await session.commit()

    async def close(self):
        await self.client.aclose()
