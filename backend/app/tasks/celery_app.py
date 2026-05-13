"""Pegasus Design — Celery Background Task Configuration"""
from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pegasus_design",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.ai_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Chicago",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# ── Scheduled Tasks (Celery Beat) ───────────────────────────
celery_app.conf.beat_schedule = {
    "generate-daily-brief": {
        "task": "app.tasks.ai_tasks.generate_daily_brief",
        "schedule": 21600.0,  # Every 6 hours
    },
    "analyze-capacity": {
        "task": "app.tasks.ai_tasks.analyze_capacity",
        "schedule": 3600.0,  # Every hour
    },
    "check-inventory-alerts": {
        "task": "app.tasks.ai_tasks.check_inventory",
        "schedule": 7200.0,  # Every 2 hours
    },
    "sync-inlineiq": {
        "task": "app.tasks.ai_tasks.sync_inlineiq",
        "schedule": 900.0,  # Every 15 minutes
    },
}
