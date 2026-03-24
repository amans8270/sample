"""V1 API router - aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.trips import router as trips_router
from app.api.v1.pages import router as pages_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(trips_router)
api_router.include_router(pages_router)
