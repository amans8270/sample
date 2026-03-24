"""Trip and TripMember SQLAlchemy models."""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import String, Date, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class TripStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"


class MemberRole(str, enum.Enum):
    OWNER = "owner"
    MEMBER = "member"


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    travel_style: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[TripStatus] = mapped_column(
        SAEnum(TripStatus), default=TripStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    members = relationship("TripMember", back_populates="trip", lazy="raise")
    generated_pages = relationship("GeneratedPage", back_populates="trip", lazy="raise")


class TripMember(Base):
    __tablename__ = "trip_members"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[MemberRole] = mapped_column(
        SAEnum(MemberRole), default=MemberRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    trip = relationship("Trip", back_populates="members", lazy="raise")
    user = relationship("User", back_populates="trips", lazy="raise")
