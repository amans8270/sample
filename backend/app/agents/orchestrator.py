"""AI Orchestrator - coordinates all agents and merges their outputs."""

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from app.agents.content_agent import ContentAgent
from app.agents.image_agent import ImageAgent
from app.agents.layout_agent import LayoutAgent
from app.agents.personalization_agent import PersonalizationAgent
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AIOrchestrator:
    """Central orchestrator that calls all agents and merges outputs
    into the structured page JSON."""

    def __init__(self) -> None:
        self.content_agent = ContentAgent()
        self.image_agent = ImageAgent()
        self.layout_agent = LayoutAgent()
        self.personalization_agent = PersonalizationAgent()

    async def generate_page(
        self,
        trip_data: Dict[str, Any],
        preferences: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run all agents concurrently and assemble the page JSON.

        Args:
            trip_data: Core trip info (destination, dates, budget, etc.).
            preferences: Optional user preferences for personalization.

        Returns:
            Structured page dict ready to be stored as JSON.
        """
        context = {**trip_data, "preferences": preferences or {}}

        # Run all agents concurrently for speed
        content_result, image_result, layout_result, personalization_result = (
            await asyncio.gather(
                self._safe_execute("content", self.content_agent, context),
                self._safe_execute("image", self.image_agent, context),
                self._safe_execute("layout", self.layout_agent, context),
                self._safe_execute("personalization", self.personalization_agent, context),
            )
        )

        # Merge outputs into structured components based on layout order
        components = self._assemble_components(
            layout_result.get("component_order", []),
            content_result,
            image_result,
            personalization_result,
            trip_data,
        )

        return {
            "trip_id": trip_data.get("id", ""),
            "version": f"v{int(time.time())}",
            "last_updated": time.time(),
            "theme": personalization_result.get("theme", {}),
            "components": components,
        }

    @staticmethod
    async def _safe_execute(
        name: str, agent: Any, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an agent with retry logic and fallback."""
        for attempt in range(settings.MAX_AI_RETRIES):
            try:
                return await agent.execute(context)
            except Exception as e:
                logger.warning(
                    "Agent %s attempt %d failed: %s", name, attempt + 1, e
                )
                if attempt == settings.MAX_AI_RETRIES - 1:
                    logger.error("Agent %s exhausted retries", name)
                    return {}
        return {}

    @staticmethod
    def _assemble_components(
        order: List[str],
        content: Dict[str, Any],
        images: Dict[str, Any],
        personalization: Dict[str, Any],
        trip_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Build the ordered list of page components."""
        builders: Dict[str, Any] = {
            "hero": lambda: {
                "type": "hero",
                "data": {
                    "title": trip_data.get("title", ""),
                    "destination": trip_data.get("destination", ""),
                    "image_url": images.get("hero_image", ""),
                    "dates": {
                        "start": str(trip_data.get("start_date", "")),
                        "end": str(trip_data.get("end_date", "")),
                    },
                },
            },
            "overview": lambda: {
                "type": "overview",
                "data": {
                    "text": content.get("overview", ""),
                    "travel_style": trip_data.get("travel_style", "balanced"),
                },
            },
            "itinerary": lambda: {
                "type": "itinerary",
                "data": {"days": content.get("itinerary", [])},
            },
            "budget": lambda: {
                "type": "budget",
                "data": {
                    "total": trip_data.get("budget", "N/A"),
                    "breakdown": content.get("budget_breakdown", []),
                },
            },
            "members": lambda: {
                "type": "members",
                "data": {"members": trip_data.get("members", [])},
            },
            "recommendations": lambda: {
                "type": "recommendations",
                "data": {"items": content.get("recommendations", [])},
            },
            "gallery": lambda: {
                "type": "gallery",
                "data": {"images": images.get("gallery", [])},
            },
            "tips": lambda: {
                "type": "tips",
                "data": {"items": content.get("tips", [])},
            },
        }

        components: List[Dict[str, Any]] = []
        for component_type in order:
            builder = builders.get(component_type)
            if builder:
                components.append(builder())
            else:
                components.append({"type": component_type, "data": {}})

        return components
