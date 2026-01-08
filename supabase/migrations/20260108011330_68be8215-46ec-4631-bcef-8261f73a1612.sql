-- Create season_team_participation table
CREATE TABLE public.season_team_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PLAYING', 'NOT_PLAYING')),
  submitted_by uuid REFERENCES auth.users(id),
  submitted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

-- Add confirmation_open column to seasons table
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS confirmation_open boolean NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.season_team_participation ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view participation status)
CREATE POLICY "Anyone can view participation status"
ON public.season_team_participation
FOR SELECT
USING (true);

-- Public insert/update access (internal trusted app - anyone can submit)
CREATE POLICY "Anyone can submit participation"
ON public.season_team_participation
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update participation"
ON public.season_team_participation
FOR UPDATE
USING (true);

-- Only admins can delete
CREATE POLICY "Admins can delete participation"
ON public.season_team_participation
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_season_team_participation_updated_at
BEFORE UPDATE ON public.season_team_participation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();