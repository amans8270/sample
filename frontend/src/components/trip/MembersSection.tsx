"use client";

import type { MemberData } from "@/types/page";

interface Props {
  data: MemberData;
  theme?: { accent_color?: string };
}

export default function MembersSection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  if (!data.members?.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{ color: accent }}>
        Group Members
      </h2>
      <div className="flex flex-wrap gap-3">
        {data.members.map((member, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: accent }}
            >
              {member.role === "owner" ? "O" : "M"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 capitalize">
                {member.role}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
