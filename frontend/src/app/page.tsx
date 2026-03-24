"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isAuthenticated,
  login,
  register,
  logout,
  listTrips,
  createTrip,
} from "@/lib/api";
import type { Trip } from "@/types/page";

export default function HomePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Trip form state
  const [tripTitle, setTripTitle] = useState("");
  const [tripDest, setTripDest] = useState("");
  const [tripDesc, setTripDesc] = useState("");
  const [tripBudget, setTripBudget] = useState("");
  const [tripStyle, setTripStyle] = useState("balanced");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");

  useEffect(() => {
    const a = isAuthenticated();
    setAuthed(a);
    if (a) loadTrips();
    else setLoading(false);
  }, []);

  async function loadTrips() {
    setLoading(true);
    try {
      const data = await listTrips();
      setTrips(data.trips);
    } catch {
      setError("Failed to load trips");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register(email, password, fullName);
      }
      await login(email, password);
      setAuthed(true);
      setShowAuth(false);
      loadTrips();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  }

  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const trip = await createTrip({
        title: tripTitle,
        destination: tripDest,
        description: tripDesc || undefined,
        budget: tripBudget || undefined,
        travel_style: tripStyle,
        start_date: tripStart || undefined,
        end_date: tripEnd || undefined,
      });
      setShowCreate(false);
      setTripTitle("");
      setTripDest("");
      setTripDesc("");
      setTripBudget("");
      setTripStyle("balanced");
      setTripStart("");
      setTripEnd("");
      router.push(`/trip/${trip.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create trip");
    }
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setTrips([]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">TripAI</h1>
          <div className="flex items-center gap-3">
            {authed ? (
              <>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                  + New Trip
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
            <button onClick={() => setError("")} className="ml-2 font-bold">
              x
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {isRegister ? "Create Account" : "Sign In"}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 text-sm"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                {isRegister ? "Register" : "Sign In"}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-3 text-center">
              {isRegister ? "Already have an account?" : "No account?"}{" "}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-indigo-600 font-medium"
              >
                {isRegister ? "Sign In" : "Register"}
              </button>
            </p>
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create a New Trip</h2>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <input
                type="text"
                placeholder="Trip Title *"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Destination *"
                value={tripDest}
                onChange={(e) => setTripDest(e.target.value)}
                required
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={tripDesc}
                onChange={(e) => setTripDesc(e.target.value)}
                rows={3}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={tripStart}
                  onChange={(e) => setTripStart(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm"
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={tripEnd}
                  onChange={(e) => setTripEnd(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Budget (e.g. 3000)"
                value={tripBudget}
                onChange={(e) => setTripBudget(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              />
              <select
                value={tripStyle}
                onChange={(e) => setTripStyle(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 text-sm"
              >
                <option value="balanced">Balanced</option>
                <option value="luxury">Luxury</option>
                <option value="adventure">Adventure</option>
                <option value="budget">Budget</option>
              </select>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Create Trip
              </button>
            </form>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-3 w-full text-center text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {!authed ? (
          <div className="text-center py-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Travel Pages
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Create a trip and let AI generate a unique, shareable travel
              microsite with itineraries, images, budgets, and recommendations.
            </p>
            <button
              onClick={() => {
                setIsRegister(true);
                setShowAuth(true);
              }}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-lg hover:bg-indigo-700 transition font-medium"
            >
              Get Started
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              No trips yet
            </h2>
            <p className="text-gray-500 mb-6">
              Create your first AI-powered trip page!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-medium"
            >
              + Create Trip
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Your Trips
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                  className="text-left bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {trip.title}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {trip.destination}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full capitalize">
                      {trip.status}
                    </span>
                    {trip.travel_style && (
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                        {trip.travel_style}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
