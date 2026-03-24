"""Personalization Agent - adapts content based on user preferences."""

import logging
from typing import Any, Dict

from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)


class PersonalizationAgent(BaseAgent):
    """Adjusts theme, language, and emphasis based on user preferences."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        preferences = context.get("preferences", {})
        travel_style = context.get("travel_style", "balanced")

        theme = self._resolve_theme(travel_style, preferences)
        emphasis = self._resolve_emphasis(travel_style, preferences)

        return {
            "theme": theme,
            "emphasis": emphasis,
            "language": preferences.get("language", "en"),
        }

    @staticmethod
    def _resolve_theme(travel_style: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Pick color palette and style based on travel style."""
        themes = {
            "luxury": {
                "primary_color": "#1a1a2e",
                "accent_color": "#e94560",
                "font": "Playfair Display",
                "mood": "elegant",
            },
            "adventure": {
                "primary_color": "#2d6a4f",
                "accent_color": "#f77f00",
                "font": "Montserrat",
                "mood": "energetic",
            },
            "budget": {
                "primary_color": "#264653",
                "accent_color": "#e9c46a",
                "font": "Inter",
                "mood": "practical",
            },
            "balanced": {
                "primary_color": "#1e1a33",
                "accent_color": "#725BFF",
                "font": "Lato",
                "mood": "modern",
            },
        }
        base_theme = themes.get(travel_style, themes["balanced"])
        if "primary_color" in preferences:
            base_theme["primary_color"] = preferences["primary_color"]
        return base_theme

    @staticmethod
    def _resolve_emphasis(travel_style: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Decide which sections to emphasize."""
        if travel_style == "luxury":
            return {"highlight_sections": ["overview", "recommendations"], "detail_level": "high"}
        if travel_style == "adventure":
            return {"highlight_sections": ["itinerary", "tips"], "detail_level": "medium"}
        if travel_style == "budget":
            return {"highlight_sections": ["budget", "tips"], "detail_level": "medium"}
        return {"highlight_sections": ["itinerary", "overview"], "detail_level": "medium"}
