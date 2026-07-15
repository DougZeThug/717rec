export type HeroCardTargetType = 'none' | 'team' | 'division' | 'season';
export type HeroCardType =
  'standard' | 'champions' | 'event' | 'announcement' | 'participation' | 'request' | 'flyer';

interface EventWinner {
  place: number;
  names: string;
}

export interface EventWeekWinners {
  week: number;
  winners: EventWinner[];
}

interface StandardHeroCardMetadata {
  [key: string]: unknown;
}

export interface ChampionsHeroCardMetadata {
  champions?: Record<string, string>;
  [key: string]: unknown;
}

export interface EventHeroCardMetadata {
  is_active_event?: boolean;
  check_in_time?: string;
  start_time?: string;
  buy_in?: string;
  payouts?: string;
  past_winners?: EventWeekWinners[];
  [key: string]: unknown;
}

export type HeroCardMetadataByType = {
  standard: StandardHeroCardMetadata;
  champions: ChampionsHeroCardMetadata;
  event: EventHeroCardMetadata;
  announcement: StandardHeroCardMetadata;
  participation: StandardHeroCardMetadata;
  request: StandardHeroCardMetadata;
  flyer: StandardHeroCardMetadata;
};

export type HeroCardMetadata = HeroCardMetadataByType[HeroCardType];

export interface HeroCard {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  background_color: string;
  text_color: string;
  accent_color: string | null;
  image_url: string | null;
  icon_name: string | null;
  is_visible: boolean;
  sort_order: number;
  target_type: HeroCardTargetType;
  target_id: string | null;
  card_type: HeroCardType;
  metadata: HeroCardMetadata;
  created_at: string;
  updated_at: string;
}

export interface HeroCardFormData {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  cta_label: string;
  cta_url: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  image_url: string;
  icon_name: string;
  is_visible: boolean;
  sort_order: number;
  target_type: HeroCardTargetType;
  target_id: string;
  card_type: HeroCardType;
  metadata: string; // JSON string for form editing
}
