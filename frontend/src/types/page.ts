/**
 * Types matching the backend's generated page JSON structure.
 */

export interface PageComponent {
  type: string;
  data: Record<string, unknown>;
}

export interface PageTheme {
  primary_color: string;
  accent_color: string;
  font: string;
  mood: string;
}

export interface GeneratedPageContent {
  trip_id: string;
  version: string;
  last_updated: number;
  theme?: PageTheme;
  components: PageComponent[];
}

export interface GeneratedPageResponse {
  id: string;
  trip_id: string;
  content: GeneratedPageContent;
  version: number;
  last_updated: string;
  created_at: string;
}

// Component-specific data types

export interface HeroData {
  title: string;
  destination: string;
  image_url: string;
  dates: { start: string; end: string };
}

export interface OverviewData {
  text: string;
  travel_style: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string[];
}

export interface ItineraryData {
  days: ItineraryDay[];
}

export interface BudgetData {
  total: string;
  breakdown: Array<{ category: string; amount: string }>;
}

export interface MemberData {
  members: Array<{ user_id: string; role: string }>;
}

export interface RecommendationItem {
  category: string;
  items: string[];
}

export interface RecommendationsData {
  items: RecommendationItem[];
}

export interface GalleryData {
  images: string[];
}

export interface TipsData {
  items: string[];
}

// Trip types

export interface Trip {
  id: string;
  title: string;
  destination: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  travel_style?: string;
  status: string;
  created_at: string;
  updated_at: string;
  members: Array<{ id: string; user_id: string; role: string; joined_at: string }>;
}

export interface TripListResponse {
  trips: Trip[];
  total: number;
  page: number;
  per_page: number;
}
