"""Tests for auth endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "password": "Str0ngP@ss", "full_name": "Jane Doe"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "user@example.com"
    assert data["full_name"] == "Jane Doe"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "Pass1234"},
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "Pass1234"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "Pass1234"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "Pass1234"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bad@example.com", "password": "Correct"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "bad@example.com", "password": "Wrong"},
    )
    assert resp.status_code == 401
