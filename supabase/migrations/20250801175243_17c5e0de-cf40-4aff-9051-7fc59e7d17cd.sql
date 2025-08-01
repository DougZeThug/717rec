-- Strengthen RLS policies to use secure admin checking

-- Update team_memberships to use secure admin function for admin operations
DROP POLICY IF EXISTS "Admins can update team memberships" ON public.team_memberships;
CREATE POLICY "Admins can update team memberships"
ON public.team_memberships
FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Update team_badge_events to use secure admin function
DROP POLICY IF EXISTS "Admins can manage team badges" ON public.team_badge_events;
CREATE POLICY "Admins can manage team badges"
ON public.team_badge_events
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Update participants table to use secure admin function
DROP POLICY IF EXISTS "Admins have full access to participants" ON public.participants;
CREATE POLICY "Admins have full access to participants"
ON public.participants
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Add logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (current_user_is_admin());

-- Create function to log security-sensitive operations
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
SET search_path = public
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