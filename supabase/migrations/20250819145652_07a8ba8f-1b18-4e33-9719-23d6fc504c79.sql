-- Create score_submissions table for pending score reports
CREATE TABLE IF NOT EXISTS public.score_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_team TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.score_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert submissions
CREATE POLICY "Allow anonymous score submissions" 
ON public.score_submissions 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view all submissions
CREATE POLICY "Admins can view all score submissions" 
ON public.score_submissions 
FOR SELECT 
USING (current_user_is_admin());

-- Allow admins to update submissions (for approval/rejection)
CREATE POLICY "Admins can update score submissions" 
ON public.score_submissions 
FOR UPDATE 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Create index for performance
CREATE INDEX idx_score_submissions_match_id ON public.score_submissions(match_id);
CREATE INDEX idx_score_submissions_status ON public.score_submissions(status);
CREATE INDEX idx_score_submissions_created_at ON public.score_submissions(created_at DESC);

-- Create view for pending matches (incomplete and ≥16 hours past start)
CREATE OR REPLACE VIEW public.v_pending_matches AS
SELECT 
  m.*,
  t1.name as team1_name,
  t1.logo_url as team1_logo,
  t2.name as team2_name,
  t2.logo_url as team2_logo
FROM public.matches m
JOIN public.teams t1 ON m.team1_id = t1.id
JOIN public.teams t2 ON m.team2_id = t2.id
WHERE 
  m.iscompleted = false
  AND m.date IS NOT NULL
  AND m.date AT TIME ZONE 'America/Chicago' <= (now() AT TIME ZONE 'America/Chicago' - INTERVAL '16 hours')
ORDER BY m.date ASC;

-- Create index on matches.date for the view performance
CREATE INDEX IF NOT EXISTS idx_matches_date_incomplete ON public.matches(date) 
WHERE iscompleted = false AND date IS NOT NULL;