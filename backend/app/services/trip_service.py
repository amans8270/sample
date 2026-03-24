"""Trip service - business logic for trip CRUD operations."""

import logging
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trip import Trip, TripMember, MemberRole, TripStatus

logger = logging.getLogger(__name__)


class TripService:
    """Handles trip CRUD and membership."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_trip(
        self,
        user_id: str,
        title: str,
        destination: str,
        description: Optional[str] = None,
        start_date=None,
        end_date=None,
        budget: Optional[str] = None,
        travel_style: Optional[str] = None,
    ) -> Trip:
        trip = Trip(
            title=title,
            destination=destination,
            description=description,
            start_date=start_date,
            end_date=end_date,
            budget=budget,
            travel_style=travel_style,
            status=TripStatus.DRAFT,
        )
        self.db.add(trip)
        await self.db.flush()

        member = TripMember(
            trip_id=trip.id,
            user_id=user_id,
            role=MemberRole.OWNER,
        )
        self.db.add(member)
        await self.db.flush()

        # Re-fetch with eager-loaded members
        return await self.get_trip(trip.id)  # type: ignore[return-value]

    async def get_trip(self, trip_id: str) -> Optional[Trip]:
        result = await self.db.execute(
            select(Trip)
            .where(Trip.id == trip_id)
            .options(selectinload(Trip.members))
        )
        return result.scalars().first()

    async def list_user_trips(
        self, user_id: str, page: int = 1, per_page: int = 20
    ) -> tuple[List[Trip], int]:
        # Count
        count_q = (
            select(func.count())
            .select_from(Trip)
            .join(TripMember, TripMember.trip_id == Trip.id)
            .where(TripMember.user_id == user_id)
        )
        total_result = await self.db.execute(count_q)
        total = total_result.scalar() or 0

        # Fetch page
        q = (
            select(Trip)
            .join(TripMember, TripMember.trip_id == Trip.id)
            .where(TripMember.user_id == user_id)
            .options(selectinload(Trip.members))
            .order_by(Trip.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        result = await self.db.execute(q)
        trips = list(result.unique().scalars().all())

        return trips, total

    async def update_trip(self, trip_id: str, **kwargs) -> Optional[Trip]:
        trip = await self.get_trip(trip_id)
        if not trip:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(trip, key):
                setattr(trip, key, value)
        await self.db.flush()
        return trip

    async def is_member(self, trip_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(TripMember).where(
                TripMember.trip_id == trip_id,
                TripMember.user_id == user_id,
            )
        )
        return result.scalars().first() is not None

    async def add_member(
        self, trip_id: str, user_id: str, role: MemberRole = MemberRole.MEMBER
    ) -> TripMember:
        member = TripMember(trip_id=trip_id, user_id=user_id, role=role)
        self.db.add(member)
        await self.db.flush()
        return member
