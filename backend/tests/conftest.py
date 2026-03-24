"""Shared test fixtures."""

import os
from typing import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Force in-memory SQLite for tests BEFORE importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["DEBUG"] = "false"

from app.core import database as db_module  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create a brand-new in-memory DB for every test.

    We also patch the module-level engine so that ``init_db()`` (called
    during the app lifespan) creates tables in the *same* in-memory
    database that the test sessions use.
    """
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Patch the module-level engine so init_db() uses our test engine
    original_engine = db_module.engine
    db_module.engine = engine

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()
    app.dependency_overrides.pop(get_db, None)
    db_module.engine = original_engine


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    """Client with a registered + authenticated user."""
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "TestPass123!", "full_name": "Test User"},
    )
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPass123!"},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
