ALTER TABLE public.score_submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS score_submissions_user_id_idx ON public.score_submissions(user_id);
CREATE INDEX IF NOT EXISTS score_submissions_team_id_idx ON public.score_submissions(team_id);