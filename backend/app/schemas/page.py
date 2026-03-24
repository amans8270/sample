"""Pydantic schemas for generated page endpoints."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PageComponent(BaseModel):
    type: str
    data: Dict[str, Any] = {}


class GeneratedPageContent(BaseModel):
    trip_id: str
    version: str
    last_updated: float
    components: List[PageComponent]


class GeneratedPageResponse(BaseModel):
    id: str
    trip_id: str
    content: GeneratedPageContent
    version: int
    last_updated: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class GeneratePageRequest(BaseModel):
    force_regenerate: bool = False
    preferences: Optional[Dict[str, Any]] = None
