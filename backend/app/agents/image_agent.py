"""Image Agent - fetches or generates images for the trip page."""

import logging
from typing import Any, Dict, List

from app.agents.base import BaseAgent
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ImageAgent(BaseAgent):
    """Generates image URLs for the trip page hero, itinerary, etc."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        destination = context.get("destination", "travel")

        if settings.OPENAI_API_KEY:
            return await self._generate_with_ai(destination)

        return self._generate_fallback(destination)

    async def _generate_with_ai(self, destination: str) -> Dict[str, Any]:
        """Use OpenAI to suggest image descriptions (actual image gen is optional)."""
        try:
            import openai

            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a travel photography expert. Return only valid JSON.",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Suggest 5 Unsplash image search queries for a trip to {destination}. "
                            'Return JSON: {{"hero_query": str, "gallery_queries": [str]}}'
                        ),
                    },
                ],
                max_tokens=256,
                temperature=0.5,
            )

            import json

            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            data = json.loads(raw)

            hero_query = data.get("hero_query", destination)
            gallery_queries = data.get("gallery_queries", [destination])

            return {
                "hero_image": self._unsplash_url(hero_query),
                "gallery": [self._unsplash_url(q) for q in gallery_queries[:5]],
            }
        except Exception as e:
            logger.error("ImageAgent AI call failed: %s", e)
            return self._generate_fallback(destination)

    @staticmethod
    def _unsplash_url(query: str, width: int = 1200, height: int = 600) -> str:
        """Build an Unsplash Source URL (free, no API key required)."""
        safe_query = query.replace(" ", ",")
        return f"https://source.unsplash.com/{width}x{height}/?{safe_query}"

    @classmethod
    def _generate_fallback(cls, destination: str) -> Dict[str, Any]:
        queries: List[str] = [
            f"{destination} landmark",
            f"{destination} food",
            f"{destination} culture",
            f"{destination} nature",
            f"{destination} street",
        ]
        return {
            "hero_image": cls._unsplash_url(f"{destination} skyline"),
            "gallery": [cls._unsplash_url(q) for q in queries],
        }
