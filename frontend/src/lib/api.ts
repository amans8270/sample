/**
 * API client for the TripAI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("tripai_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  return res.json();
}

// Auth

export async function register(
  email: string,
  password: string,
  fullName?: string,
) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
}

export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; token_type: string }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  if (typeof window !== "undefined") {
    localStorage.setItem("tripai_token", data.access_token);
  }
  return data;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tripai_token");
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("tripai_token");
}

// Trips

import type { Trip, TripListResponse, GeneratedPageResponse } from "@/types/page";

export async function createTrip(data: {
  title: string;
  destination: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  travel_style?: string;
}): Promise<Trip> {
  return request("/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listTrips(
  page = 1,
  perPage = 20,
): Promise<TripListResponse> {
  return request(`/api/v1/trips?page=${page}&per_page=${perPage}`);
}

export async function getTrip(tripId: string): Promise<Trip> {
  return request(`/api/v1/trips/${tripId}`);
}

// Pages

export async function getTripPage(
  tripId: string,
): Promise<GeneratedPageResponse> {
  return request(`/api/v1/trips/${tripId}/page`);
}

export async function generateTripPage(
  tripId: string,
  forceRegenerate = false,
): Promise<GeneratedPageResponse> {
  return request(`/api/v1/trips/${tripId}/generate`, {
    method: "POST",
    body: JSON.stringify({ force_regenerate: forceRegenerate }),
  });
}
