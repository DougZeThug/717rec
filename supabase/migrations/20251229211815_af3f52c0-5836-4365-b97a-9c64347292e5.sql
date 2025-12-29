-- Fix SECURITY DEFINER functions with incomplete search_path settings
-- This prevents potential search_path manipulation attacks

-- Fix get_blind_draw_signup_count - add pg_catalog to search_path
CREATE OR REPLACE FUNCTION public.get_blind_draw_signup_count(p_event_date date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.blind_draw_signups
  WHERE event_date = p_event_date;
$$;

-- Fix log_security_operation - add pg_catalog to search_path
CREATE OR REPLACE FUNCTION public.log_security_operation(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
END;
$$;