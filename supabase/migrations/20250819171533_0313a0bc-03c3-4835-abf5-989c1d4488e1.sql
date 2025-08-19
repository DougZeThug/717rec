-- Phase 2: Additional Security Hardening

-- 1. Add rate limiting table for future use
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Enhance admin privilege change logging
CREATE OR REPLACE FUNCTION public.enhanced_log_admin_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- Log all admin privilege changes with enhanced details
  IF (TG_OP = 'UPDATE' AND OLD.is_admin IS DISTINCT FROM NEW.is_admin) THEN
    INSERT INTO public.admin_privilege_changes (
      target_user_id,
      changed_by_user_id,
      old_admin_status,
      new_admin_status
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.is_admin,
      NEW.is_admin
    );
    
    -- Also log to security audit log
    PERFORM public.log_security_operation(
      CASE WHEN NEW.is_admin THEN 'ADMIN_GRANTED' ELSE 'ADMIN_REVOKED' END,
      'profiles',
      NEW.id,
      jsonb_build_object('old_is_admin', OLD.is_admin),
      jsonb_build_object('new_is_admin', NEW.is_admin)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace the existing trigger with enhanced version
DROP TRIGGER IF EXISTS log_admin_privilege_change ON public.profiles;
CREATE TRIGGER enhanced_log_admin_privilege_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_log_admin_privilege_change();

-- 3. Create security validation function for critical operations
CREATE OR REPLACE FUNCTION public.validate_admin_operation(operation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- Validate that user is authenticated and is admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required for operation: %', operation_type;
  END IF;
  
  -- Log the admin operation
  PERFORM public.log_security_operation(
    'ADMIN_OPERATION',
    null,
    auth.uid(),
    null,
    jsonb_build_object('operation_type', operation_type, 'timestamp', now())
  );
  
  RETURN true;
END;
$$;

-- 4. Enhance team membership security
CREATE POLICY "Admins can manage all team memberships"
  ON public.team_memberships
  FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());