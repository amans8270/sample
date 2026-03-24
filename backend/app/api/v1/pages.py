"""Page generation and retrieval endpoints."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_id, get_optional_user_id, rate_limit
from app.schemas.page import GeneratedPageResponse, GeneratedPageContent, GeneratePageRequest
from app.services.page_service import PageService
from app.services.trip_service import TripService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trips", tags=["pages"])


def _serialize_page(page) -> GeneratedPageResponse:
    """Convert a GeneratedPage ORM object to response schema."""
    content_dict = json.loads(page.content)
    return GeneratedPageResponse(
        id=page.id,
        trip_id=page.trip_id,
        content=GeneratedPageContent(**content_dict),
        version=page.version,
        last_updated=page.last_updated,
        created_at=page.created_at,
    )


@router.get("/{trip_id}/page", response_model=GeneratedPageResponse)
async def get_trip_page(
    trip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the latest generated page for a trip.

    Returns 404 if no page has been generated yet.
    """
    trip_svc = TripService(db)
    if not await trip_svc.is_member(trip_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this trip")

    page_svc = PageService(db)
    page = await page_svc.get_page(trip_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No generated page found. Call POST /generate first.",
        )

    return _serialize_page(page)


@router.post(
    "/{trip_id}/generate",
    response_model=GeneratedPageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_trip_page(
    trip_id: str,
    payload: GeneratePageRequest = GeneratePageRequest(),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    """Trigger AI page generation for a trip.

    Set force_regenerate=true to bypass cooldown and regenerate.
    """
    trip_svc = TripService(db)
    trip = await trip_svc.get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    if not await trip_svc.is_member(trip_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this trip")

    page_svc = PageService(db)
    page = await page_svc.generate_page(
        trip=trip,
        force=payload.force_regenerate,
        preferences=payload.preferences,
    )
    return _serialize_page(page)
