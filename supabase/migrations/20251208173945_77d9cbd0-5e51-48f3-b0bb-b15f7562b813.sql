-- Create hero_cards table for admin-configurable homepage cards
CREATE TABLE public.hero_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  cta_label TEXT,
  cta_url TEXT,
  background_color TEXT DEFAULT 'bg-gradient-to-br from-blue-600 to-amber-500',
  text_color TEXT DEFAULT 'text-white',
  accent_color TEXT,
  image_url TEXT,
  icon_name TEXT,
  is_visible BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  target_type TEXT DEFAULT 'none' CHECK (target_type IN ('none', 'team', 'division', 'season')),
  target_id UUID,
  card_type TEXT DEFAULT 'standard' CHECK (card_type IN ('standard', 'champions', 'event', 'announcement')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_cards ENABLE ROW LEVEL SECURITY;

-- Public can view visible cards
CREATE POLICY "Public can view visible hero cards"
  ON public.hero_cards FOR SELECT
  USING (is_visible = true);

-- Admins can view all cards
CREATE POLICY "Admins can view all hero cards"
  ON public.hero_cards FOR SELECT
  USING (current_user_is_admin());

-- Admins can insert hero cards
CREATE POLICY "Admins can insert hero cards"
  ON public.hero_cards FOR INSERT
  WITH CHECK (current_user_is_admin());

-- Admins can update hero cards
CREATE POLICY "Admins can update hero cards"
  ON public.hero_cards FOR UPDATE
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Admins can delete hero cards
CREATE POLICY "Admins can delete hero cards"
  ON public.hero_cards FOR DELETE
  USING (current_user_is_admin());

-- Seed existing hero cards
INSERT INTO public.hero_cards (slug, title, subtitle, body, cta_label, cta_url, background_color, text_color, icon_name, is_visible, sort_order, card_type, metadata) VALUES
('blind-draw', 'Blind Draw', 'Thursday, December 11th', 'Weekly blind draw event with random team pairings', NULL, NULL, 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700', 'text-white', 'Shuffle', true, 1, 'event', '{"check_in_time": "2025-12-11T23:30:00Z", "start_time": "2025-12-12T00:00:00Z", "buy_in": "$10", "payouts": "Top 3", "past_winners": [{"week": 1, "winners": [{"place": 1, "names": "Shan & Earl"}, {"place": 2, "names": "Kaitlyn & Scotty"}, {"place": 3, "names": "Katie & Steve"}]}]}');

INSERT INTO public.hero_cards (slug, title, cta_label, cta_url, background_color, text_color, icon_name, is_visible, sort_order, card_type) VALUES
('league-history', 'League History', 'View History', '/history', 'bg-gradient-to-r from-blue-600 to-amber-500', 'text-white', 'History', true, 2, 'standard');

INSERT INTO public.hero_cards (slug, title, subtitle, background_color, text_color, icon_name, is_visible, sort_order, card_type, target_type, metadata) VALUES
('fall-2025-champions', '🏆 Fall 2025 Champions', 'Division Champions', 'bg-white dark:bg-slate-800', 'text-slate-900 dark:text-white', 'Trophy', true, 3, 'champions', 'season', '{"season_name": "Fall 2025", "champions": {"Competitive": "77110b92-d2d8-495b-afed-cac65deb6253", "Intermediate 1": "0c7261b9-db22-48d1-8487-ba9eeb90fbef", "Intermediate 2": "01ec006b-6ee3-47b3-ac8d-f93cc11d3460", "Recreational": "34b1dacf-0c30-4a4c-8228-432701868f34"}}');

INSERT INTO public.hero_cards (slug, title, subtitle, cta_label, cta_url, background_color, text_color, icon_name, is_visible, sort_order, card_type) VALUES
('playoffs-announcement', 'Championship Week Bracket!', NULL, 'View Playoffs', '/playoffs', 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600', 'text-white', 'Trophy', false, 0, 'announcement');