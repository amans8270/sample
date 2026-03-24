"use client";

import { lazy, Suspense } from "react";
import type { PageComponent, PageTheme } from "@/types/page";

import HeroSection from "./HeroSection";
import OverviewSection from "./OverviewSection";
import ItinerarySection from "./ItinerarySection";
import BudgetSection from "./BudgetSection";
import MembersSection from "./MembersSection";
import RecommendationsSection from "./RecommendationsSection";
import GallerySection from "./GallerySection";
import TipsSection from "./TipsSection";

/**
 * Maps backend component type strings to React components.
 * Unknown types are silently skipped (safe handling).
 */
const COMPONENT_MAP: Record<
  string,
  React.ComponentType<{ data: any; theme?: Partial<PageTheme> }>
> = {
  hero: HeroSection,
  overview: OverviewSection,
  itinerary: ItinerarySection,
  budget: BudgetSection,
  members: MembersSection,
  recommendations: RecommendationsSection,
  gallery: GallerySection,
  tips: TipsSection,
};

interface Props {
  components: PageComponent[];
  theme?: PageTheme;
}

export default function DynamicRenderer({ components, theme }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {components.map((component, index) => {
        const Component = COMPONENT_MAP[component.type];

        if (!Component) {
          // Unknown component type — skip safely
          if (process.env.NODE_ENV === "development") {
            console.warn(`Unknown component type: "${component.type}"`);
          }
          return null;
        }

        return (
          <Suspense
            key={`${component.type}-${index}`}
            fallback={
              <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="animate-pulse bg-gray-100 rounded-xl h-32" />
              </div>
            }
          >
            <Component data={component.data} theme={theme} />
          </Suspense>
        );
      })}
    </div>
  );
}
