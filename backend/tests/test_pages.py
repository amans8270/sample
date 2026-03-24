"""Tests for page generation endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_page(auth_client: AsyncClient):
    """Generate a page using fallback (no OpenAI key)."""
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={
            "title": "Bali Adventure",
            "destination": "Bali, Indonesia",
            "budget": "2000",
            "travel_style": "adventure",
        },
    )
    trip_id = create_resp.json()["id"]

    resp = await auth_client.post(f"/api/v1/trips/{trip_id}/generate")
    assert resp.status_code == 201
    data = resp.json()
    assert data["trip_id"] == trip_id
    assert data["version"] == 1
    assert "components" in data["content"]

    components = data["content"]["components"]
    component_types = [c["type"] for c in components]
    assert "hero" in component_types
    assert "itinerary" in component_types
    assert "overview" in component_types


@pytest.mark.asyncio
async def test_get_page_after_generation(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={"title": "Rome Trip", "destination": "Rome, Italy"},
    )
    trip_id = create_resp.json()["id"]

    await auth_client.post(f"/api/v1/trips/{trip_id}/generate")

    resp = await auth_client.get(f"/api/v1/trips/{trip_id}/page")
    assert resp.status_code == 200
    assert resp.json()["trip_id"] == trip_id


@pytest.mark.asyncio
async def test_get_page_not_generated(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={"title": "No Page", "destination": "Nowhere"},
    )
    trip_id = create_resp.json()["id"]

    resp = await auth_client.get(f"/api/v1/trips/{trip_id}/page")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_force_regenerate(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={"title": "Regen Test", "destination": "London, UK"},
    )
    trip_id = create_resp.json()["id"]

    resp1 = await auth_client.post(f"/api/v1/trips/{trip_id}/generate")
    assert resp1.json()["version"] == 1

    resp2 = await auth_client.post(
        f"/api/v1/trips/{trip_id}/generate",
        json={"force_regenerate": True},
    )
    assert resp2.json()["version"] == 2
