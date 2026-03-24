"""Base agent interface for AI agents."""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAgent(ABC):
    """Abstract base class for all AI agents."""

    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's task and return structured output.

        Args:
            context: Trip data and user preferences used for generation.

        Returns:
            Structured dict with the agent's contribution to the page.
        """
        ...
