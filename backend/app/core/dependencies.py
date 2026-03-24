"""FastAPI dependencies for auth and rate limiting."""

import logging
import time
from collections import defaultdict
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
settings = get_settings()

bearer_scheme = HTTPBearer(auto_error=False)

# Simple in-memory rate limiter
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Extract and validate JWT token, return user ID."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[str]:
    """Extract user ID if token present, else None."""
    if not credentials:
        return None
    return decode_access_token(credentials.credentials)


def rate_limit(request: Request) -> None:
    """Basic in-memory rate limiter by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = 60.0

    # Prune old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if now - t < window
    ]

    if len(_rate_limit_store[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    _rate_limit_store[client_ip].append(now)
