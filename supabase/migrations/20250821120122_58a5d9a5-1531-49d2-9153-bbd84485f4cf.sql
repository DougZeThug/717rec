-- Create score_submissions table for admin review
CREATE TABLE public.score_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_team TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create view for pending matches (16+ hours past start time in EST)
CREATE OR REPLACE VIEW public.v_pending_matches AS
SELECT 
  m.id,
  m.date,
  m.location,
  t1.id as team1_id,
  t1.name as team1_name,
  t1.logo_url as team1_logo,
  t2.id as team2_id,
  t2.name as team2_name,
  t2.logo_url as team2_logo
FROM public.matches m
LEFT JOIN public.teams t1 ON m.team1_id = t1.id
LEFT JOIN public.teams t2 ON m.team2_id = t2.id
WHERE m.iscompleted = false
  AND m.date IS NOT NULL
  AND m.date AT TIME ZONE 'America/New_York' <= (now() AT TIME ZONE 'America/New_York' - INTERVAL '16 hours')
ORDER BY m.date ASC
LIMIT 50;

-- Enable RLS on score_submissions
ALTER TABLE public.score_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to submit scores (no auth required)
CREATE POLICY "Allow anonymous score submissions"
ON public.score_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to view all submissions (for admins)
CREATE POLICY "Allow authenticated users to view score submissions"
ON public.score_submissions
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to update submission status
CREATE POLICY "Allow authenticated users to update score submissions"
ON public.score_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create performance index for matches filtering
CREATE INDEX IF NOT EXISTS idx_matches_pending_scores 
ON public.matches (iscompleted, date) 
WHERE iscompleted = false AND date IS NOT NULL;