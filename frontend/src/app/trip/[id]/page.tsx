"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTrip, getTripPage, generateTripPage } from "@/lib/api";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import DynamicRenderer from "@/components/trip/DynamicRenderer";
import type { Trip, GeneratedPageContent } from "@/types/page";

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [pageContent, setPageContent] = useState<GeneratedPageContent | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tripData = await getTrip(tripId);
      setTrip(tripData);

      // Use cache with stale-while-revalidate
      const content = await fetchWithCache(
        tripId,
        async () => {
          const page = await getTripPage(tripId);
          return page.content;
        },
        {
          onRevalidated: (fresh) => {
            setPageContent(fresh);
            setStale(false);
          },
        },
      );

      setPageContent(content);
    } catch (err: any) {
      if (err.message?.includes("No generated page")) {
        // Page hasn't been generated yet — that's OK
      } else if (err.status === 401) {
        router.push("/");
        return;
      } else {
        setError(err.message || "Failed to load trip");
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function handleGenerate(force = false) {
    setGenerating(true);
    setError("");
    try {
      if (force) {
        await invalidateCache(tripId);
      }
      const page = await generateTripPage(tripId, force);
      setPageContent(page.content);
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-2">
            {stale && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                Updating...
              </span>
            )}
            {!pageContent ? (
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate Page"}
              </button>
            ) : (
              <button
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50"
              >
                {generating ? "Regenerating..." : "Regenerate"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Page content */}
      {pageContent ? (
        <DynamicRenderer
          components={pageContent.components}
          theme={pageContent.theme}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {trip?.title || "Trip"}
          </h2>
          <p className="text-gray-500 mb-2">{trip?.destination}</p>
          <p className="text-gray-400 text-sm mb-8">
            No page generated yet. Click &ldquo;Generate Page&rdquo; to create
            your AI-powered travel microsite.
          </p>
        </div>
      )}
    </div>
  );
}
