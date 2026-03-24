"""Content Agent - generates itinerary, descriptions, and recommendations."""

import json
import logging
from typing import Any, Dict

from app.agents.base import BaseAgent
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ContentAgent(BaseAgent):
    """Generates textual content: overview, itinerary, recommendations."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        destination = context.get("destination", "Unknown")
        start_date = context.get("start_date")
        end_date = context.get("end_date")
        travel_style = context.get("travel_style", "balanced")
        budget = context.get("budget", "moderate")
        description = context.get("description", "")

        if settings.OPENAI_API_KEY:
            return await self._generate_with_ai(
                destination, start_date, end_date, travel_style, budget, description
            )

        return self._generate_fallback(
            destination, start_date, end_date, travel_style, budget, description
        )

    async def _generate_with_ai(
        self,
        destination: str,
        start_date: Any,
        end_date: Any,
        travel_style: str,
        budget: str,
        description: str,
    ) -> Dict[str, Any]:
        """Generate content using OpenAI API."""
        try:
            import openai

            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            prompt = (
                f"Generate a travel page content for a trip to {destination}.\n"
                f"Dates: {start_date} to {end_date}\n"
                f"Style: {travel_style}, Budget: {budget}\n"
                f"Description: {description}\n\n"
                "Return valid JSON with these keys:\n"
                '- "overview": string (2-3 paragraph destination overview)\n'
                '- "itinerary": list of {{"day": int, "title": str, "activities": [str]}}\n'
                '- "recommendations": list of {{"category": str, "items": [str]}}\n'
                '- "tips": list of strings\n'
            )

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a travel content expert. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS,
                temperature=0.7,
            )

            raw = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            return json.loads(raw)

        except Exception as e:
            logger.error("ContentAgent AI call failed: %s", e)
            return self._generate_fallback(
                destination, start_date, end_date, travel_style, budget, description
            )

    @staticmethod
    def _generate_fallback(
        destination: str,
        start_date: Any,
        end_date: Any,
        travel_style: str,
        budget: str,
        description: str,
    ) -> Dict[str, Any]:
        """Deterministic fallback when no AI key is configured."""
        return {
            "overview": (
                f"Welcome to your trip to {destination}! "
                f"This {travel_style} journey has been tailored to a {budget} budget. "
                f"{description or 'Get ready for an unforgettable adventure.'}"
            ),
            "itinerary": [
                {
                    "day": 1,
                    "title": f"Arrival in {destination}",
                    "activities": [
                        "Check into accommodation",
                        "Explore the local neighborhood",
                        "Welcome dinner at a local restaurant",
                    ],
                },
                {
                    "day": 2,
                    "title": "City Exploration",
                    "activities": [
                        "Visit top landmarks and attractions",
                        "Try local street food for lunch",
                        "Guided walking tour in the afternoon",
                    ],
                },
                {
                    "day": 3,
                    "title": "Cultural Immersion",
                    "activities": [
                        "Visit museums and galleries",
                        "Attend a local cultural event",
                        "Farewell dinner",
                    ],
                },
            ],
            "recommendations": [
                {
                    "category": "Food",
                    "items": [
                        "Try the local cuisine",
                        "Visit the central food market",
                        "Book a cooking class",
                    ],
                },
                {
                    "category": "Activities",
                    "items": [
                        "Walking tour of historic center",
                        "Day trip to nearby attractions",
                        "Local art galleries",
                    ],
                },
            ],
            "tips": [
                f"Best time to visit {destination} varies by season.",
                "Always carry local currency for small vendors.",
                "Learn a few basic phrases in the local language.",
            ],
        }
