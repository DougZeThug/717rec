export type HeroCardTargetType = 'none' | 'team' | 'division' | 'season';
export type HeroCardType =
  | 'standard'
  | 'champions'
  | 'event'
  | 'announcement'
  | 'participation'
  | 'request'
  | 'flyer';

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
  metadata: Record<string, any>;
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
