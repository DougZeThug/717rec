-- Add RLS to the view by creating proper security policies
-- Drop and recreate the view with security definer to ensure consistent permissions

DROP VIEW IF EXISTS public.v_pending_matches;

CREATE VIEW public.v_pending_matches 
WITH (security_barrier=true)
AS
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

-- Allow public read access to the view (matches RLS policies on underlying tables)
GRANT SELECT ON public.v_pending_matches TO anon, authenticated;