-- Fix logos to use image_url instead of logo_url for pending matches
DROP VIEW IF EXISTS public.v_pending_matches;

CREATE OR REPLACE VIEW public.v_pending_matches 
WITH (security_invoker = true) AS
SELECT 
  m.id,
  m.date,
  m.location,
  t1.id as team1_id,
  t1.name as team1_name,
  t1.image_url as team1_logo,
  t2.id as team2_id,
  t2.name as team2_name,
  t2.image_url as team2_logo
FROM public.matches m
LEFT JOIN public.teams t1 ON m.team1_id = t1.id
LEFT JOIN public.teams t2 ON m.team2_id = t2.id
WHERE m.iscompleted = false
  AND m.date IS NOT NULL
  AND m.date AT TIME ZONE 'America/New_York' <= (now() AT TIME ZONE 'America/New_York' - INTERVAL '16 hours')
ORDER BY m.date ASC
LIMIT 50;