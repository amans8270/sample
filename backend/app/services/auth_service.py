"""Authentication service - user registration, login, token management."""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User

logger = logging.getLogger(__name__)


class AuthService:
    """Handles user registration, login, and token creation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(
        self, email: str, password: str, full_name: Optional[str] = None
    ) -> User:
        existing = await self._get_by_email(email)
        if existing:
            raise ValueError("A user with this email already exists")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def login(self, email: str, password: str) -> tuple[User, str]:
        """Authenticate and return (user, access_token) or raise."""
        user = await self._get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is deactivated")

        token = create_access_token(subject=user.id)
        return user, token

    async def get_user(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def _get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()
