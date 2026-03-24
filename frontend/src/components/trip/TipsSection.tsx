"use client";

import type { TipsData } from "@/types/page";

interface Props {
  data: TipsData;
  theme?: { accent_color?: string };
}

export default function TipsSection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  if (!data.items?.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{ color: accent }}>
        Travel Tips
      </h2>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <ul className="space-y-3">
          {data.items.map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className="text-amber-500 text-lg flex-shrink-0">
                &#9733;
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
