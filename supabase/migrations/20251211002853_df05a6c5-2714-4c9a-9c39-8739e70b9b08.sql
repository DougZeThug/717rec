-- Create a function to get blind draw signup count (publicly accessible)
CREATE OR REPLACE FUNCTION public.get_blind_draw_signup_count(p_event_date date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM blind_draw_signups
  WHERE event_date = p_event_date;
$$;