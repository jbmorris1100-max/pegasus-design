"""Pegasus Design — API v1 Router"""
from fastapi import APIRouter
from app.api.v1 import dashboard, customers, projects, estimates, events, ai, inventory, installs, schedule_blocks, purchase_orders

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(customers.router, prefix="/customers", tags=["CRM"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(estimates.router, prefix="/estimates", tags=["Estimating"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(installs.router, prefix="/installs", tags=["Installs"])
api_router.include_router(schedule_blocks.router, prefix="/schedule-blocks", tags=["Scheduling"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchasing"])
