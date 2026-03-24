"use client";

import type { GalleryData } from "@/types/page";

interface Props {
  data: GalleryData;
  theme?: { accent_color?: string };
}

export default function GallerySection({ data, theme }: Props) {
  const accent = theme?.accent_color || "#725BFF";

  if (!data.images?.length) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-6" style={{ color: accent }}>
        Gallery
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.images.map((url, i) => (
          <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg">
            <img
              src={url}
              alt={`Travel photo ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
