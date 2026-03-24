"""Trip CRUD endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_id, rate_limit
from app.schemas.trip import TripCreate, TripUpdate, TripResponse, TripListResponse
from app.services.trip_service import TripService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    """Create a new trip. The authenticated user becomes the owner."""
    svc = TripService(db)
    trip = await svc.create_trip(
        user_id=user_id,
        title=payload.title,
        destination=payload.destination,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        budget=payload.budget,
        travel_style=payload.travel_style,
    )
    return trip


@router.get("", response_model=TripListResponse)
async def list_trips(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List trips for the authenticated user with pagination."""
    svc = TripService(db)
    trips, total = await svc.list_user_trips(user_id, page=page, per_page=per_page)
    return TripListResponse(trips=trips, total=total, page=page, per_page=per_page)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a single trip by ID. Must be a member."""
    svc = TripService(db)
    trip = await svc.get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    if not await svc.is_member(trip_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this trip")

    return trip


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update trip details. Must be a member."""
    svc = TripService(db)
    if not await svc.is_member(trip_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this trip")

    trip = await svc.update_trip(trip_id, **payload.model_dump(exclude_unset=True))
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip
