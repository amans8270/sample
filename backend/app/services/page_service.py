"""Page generation service - orchestrates AI page creation and DB persistence."""

import json
import logging
import time
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.orchestrator import AIOrchestrator
from app.core.config import get_settings
from app.models.generated_page import GeneratedPage
from app.models.trip import Trip

logger = logging.getLogger(__name__)
settings = get_settings()


class PageService:
    """Manages generated page lifecycle: create, retrieve, regenerate."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.orchestrator = AIOrchestrator()

    async def get_page(self, trip_id: str) -> Optional[GeneratedPage]:
        """Get the latest generated page for a trip."""
        result = await self.db.execute(
            select(GeneratedPage)
            .where(GeneratedPage.trip_id == trip_id)
            .order_by(GeneratedPage.version.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def generate_page(
        self,
        trip: Trip,
        force: bool = False,
        preferences: Optional[Dict[str, Any]] = None,
    ) -> GeneratedPage:
        """Generate (or regenerate) a page for the given trip.

        If force=False and a recent page exists (within cooldown), returns existing.
        """
        existing = await self.get_page(trip.id)

        if existing and not force:
            age = time.time() - existing.last_updated.timestamp()
            if age < settings.PAGE_GENERATION_COOLDOWN_SECONDS:
                logger.info("Page for trip %s is fresh, returning existing", trip.id)
                return existing

        # Build trip context for agents
        trip_data: Dict[str, Any] = {
            "id": trip.id,
            "title": trip.title,
            "destination": trip.destination,
            "description": trip.description,
            "start_date": str(trip.start_date) if trip.start_date else None,
            "end_date": str(trip.end_date) if trip.end_date else None,
            "budget": trip.budget,
            "travel_style": trip.travel_style or "balanced",
            "members_count": len(trip.members) if trip.members else 1,
            "members": [
                {"user_id": m.user_id, "role": m.role.value}
                for m in (trip.members or [])
            ],
        }

        page_content = await self.orchestrator.generate_page(trip_data, preferences)

        next_version = (existing.version + 1) if existing else 1

        page = GeneratedPage(
            trip_id=trip.id,
            content=json.dumps(page_content),
            version=next_version,
        )
        self.db.add(page)
        await self.db.flush()

        logger.info("Generated page v%d for trip %s", next_version, trip.id)
        return page
