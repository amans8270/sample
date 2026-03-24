"use client";

import type { OverviewData } from "@/types/page";

interface Props {
  data: OverviewData;
  theme?: { accent_color?: string };
}

export default function OverviewSection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{ color: accent }}>
        Overview
      </h2>
      {data.travel_style && (
        <span
          className="inline-block text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full mb-4 text-white"
          style={{ backgroundColor: accent }}
        >
          {data.travel_style}
        </span>
      )}
      <p className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
        {data.text}
      </p>
    </section>
  );
}
