"""Tests for trip CRUD endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_trip(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/trips",
        json={
            "title": "Paris Getaway",
            "destination": "Paris, France",
            "budget": "3000",
            "travel_style": "luxury",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Paris Getaway"
    assert data["destination"] == "Paris, France"
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_create_trip_unauthorized(client: AsyncClient):
    resp = await client.post(
        "/api/v1/trips",
        json={"title": "No Auth", "destination": "Nowhere"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_trip(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={"title": "Tokyo Trip", "destination": "Tokyo, Japan"},
    )
    trip_id = create_resp.json()["id"]

    resp = await auth_client.get(f"/api/v1/trips/{trip_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Tokyo Trip"


@pytest.mark.asyncio
async def test_list_trips(auth_client: AsyncClient):
    await auth_client.post(
        "/api/v1/trips",
        json={"title": "Trip 1", "destination": "Place 1"},
    )
    await auth_client.post(
        "/api/v1/trips",
        json={"title": "Trip 2", "destination": "Place 2"},
    )

    resp = await auth_client.get("/api/v1/trips")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["trips"]) == 2


@pytest.mark.asyncio
async def test_update_trip(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/trips",
        json={"title": "Old Title", "destination": "Berlin"},
    )
    trip_id = create_resp.json()["id"]

    resp = await auth_client.patch(
        f"/api/v1/trips/{trip_id}",
        json={"title": "New Title", "budget": "2000"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"
    assert resp.json()["budget"] == "2000"


@pytest.mark.asyncio
async def test_get_nonexistent_trip(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/trips/nonexistent-id")
    assert resp.status_code == 404
