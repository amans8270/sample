"use client";

import type { ItineraryData } from "@/types/page";

interface Props {
  data: ItineraryData;
  theme?: { accent_color?: string };
}

export default function ItinerarySection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  if (!data.days?.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-6" style={{ color: accent }}>
        Itinerary
      </h2>
      <div className="space-y-6">
        {data.days.map((day) => (
          <div key={day.day} className="relative pl-8 border-l-2" style={{ borderColor: accent }}>
            <div
              className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {day.day}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {day.title}
            </h3>
            <ul className="space-y-1">
              {day.activities.map((activity, i) => (
                <li key={i} className="text-gray-600 flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
