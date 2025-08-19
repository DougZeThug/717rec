-- Fix Security Definer View issue by removing security_barrier
-- This ensures the view respects RLS policies of underlying tables

DROP VIEW IF EXISTS public.v_pending_matches;

-- Recreate view without security_barrier to respect RLS policies
CREATE VIEW public.v_pending_matches AS
SELECT 
  m.*,
  t1.name as team1_name,
  t1.image_url as team1_logo,
  t2.name as team2_name,
  t2.image_url as team2_logo
FROM public.matches m
JOIN public.teams t1 ON m.team1_id = t1.id
JOIN public.teams t2 ON m.team2_id = t2.id
WHERE 
  m.iscompleted = false
  AND m.date IS NOT NULL
  AND m.date AT TIME ZONE 'America/Chicago' <= (now() AT TIME ZONE 'America/Chicago' - INTERVAL '16 hours')
ORDER BY m.date ASC;

-- Grant appropriate permissions (view inherits RLS from underlying tables)
GRANT SELECT ON public.v_pending_matches TO anon, authenticated;