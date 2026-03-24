"use client";

import type { BudgetData } from "@/types/page";

interface Props {
  data: BudgetData;
  theme?: { accent_color?: string };
}

export default function BudgetSection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{ color: accent }}>
        Budget
      </h2>
      <div className="bg-gray-50 rounded-xl p-6">
        <p className="text-3xl font-bold text-gray-900 mb-4">
          ${data.total || "N/A"}
        </p>
        {data.breakdown?.length > 0 && (
          <div className="space-y-3">
            {data.breakdown.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-600">{item.category}</span>
                <span className="font-semibold text-gray-900">
                  ${item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
