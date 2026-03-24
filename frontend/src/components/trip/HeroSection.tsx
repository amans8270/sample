"use client";

import type { HeroData } from "@/types/page";

interface Props {
  data: HeroData;
  theme?: { primary_color?: string; accent_color?: string };
}

export default function HeroSection({ data, theme }: Props) {
  const bgColor = theme?.primary_color || "#1e1a33";

  return (
    <section
      className="relative w-full min-h-[420px] flex items-end overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {data.image_url && (
        <img
          src={data.image_url}
          alt={data.destination}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          loading="eager"
        />
      )}
      <div className="relative z-10 w-full px-6 pb-10 pt-20 bg-gradient-to-t from-black/70 to-transparent">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          {data.title}
        </h1>
        <p className="text-xl text-white/90 mb-3">{data.destination}</p>
        {data.dates?.start && data.dates?.end && (
          <p className="text-sm text-white/70">
            {data.dates.start} — {data.dates.end}
          </p>
        )}
      </div>
    </section>
  );
}
