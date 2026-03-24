"""Layout Agent - defines the page component order and structure."""

import logging
from typing import Any, Dict, List

from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class LayoutAgent(BaseAgent):
    """Decides the order and visibility of page components."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        budget = context.get("budget")
        members_count = context.get("members_count", 1)

        components: List[str] = [
            "hero",
            "overview",
            "itinerary",
        ]

        if budget:
            components.append("budget")

        if members_count > 1:
            components.append("members")

        components.extend(["recommendations", "gallery", "tips"])

        return {"component_order": components}
