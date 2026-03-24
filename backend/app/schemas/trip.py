"""Pydantic schemas for trip endpoints."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class TripCreate(BaseModel):
    title: str
    destination: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[str] = None
    travel_style: Optional[str] = None


class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[str] = None
    travel_style: Optional[str] = None
    status: Optional[str] = None


class TripMemberResponse(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class TripResponse(BaseModel):
    id: str
    title: str
    destination: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[str] = None
    travel_style: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    members: List[TripMemberResponse] = []

    model_config = {"from_attributes": True}


class TripListResponse(BaseModel):
    trips: List[TripResponse]
    total: int
    page: int
    per_page: int
