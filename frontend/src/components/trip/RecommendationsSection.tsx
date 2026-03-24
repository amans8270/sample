"use client";

import type { RecommendationsData } from "@/types/page";

interface Props {
  data: RecommendationsData;
  theme?: { accent_color?: string };
}

export default function RecommendationsSection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  if (!data.items?.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-6" style={{ color: accent }}>
        Recommendations
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {data.items.map((rec, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-5">
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: accent }}
            >
              {rec.category}
            </h3>
            <ul className="space-y-2">
              {rec.items.map((item, j) => (
                <li key={j} className="text-gray-600 flex items-start gap-2">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: accent }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
