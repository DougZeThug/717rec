-- Comprehensive Security Fix for Audit Logs
-- This migration completely locks down the security_audit_log table

-- Drop existing policies to rebuild them properly
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;

-- Create comprehensive RLS policies for security_audit_log table

-- 1. SELECT: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (
  -- Explicit check that user is authenticated AND admin
  auth.uid() IS NOT NULL AND current_user_is_admin() = true
);

-- 2. INSERT: Only service role can insert audit logs (system-generated)
CREATE POLICY "Service role can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 3. UPDATE: Explicitly deny all updates (audit logs should be immutable)
CREATE POLICY "Deny all updates to audit logs" 
ON public.security_audit_log 
FOR UPDATE 
TO public
USING (false);

-- 4. DELETE: Only service role can delete (for cleanup/archiving)
CREATE POLICY "Service role can delete audit logs" 
ON public.security_audit_log 
FOR DELETE 
TO service_role
USING (true);

-- 5. Explicit deny for all other operations by regular users
CREATE POLICY "Deny insert for regular users" 
ON public.security_audit_log 
FOR INSERT 
TO public
WITH CHECK (false);

CREATE POLICY "Deny delete for regular users" 
ON public.security_audit_log 
FOR DELETE 
TO public
USING (false);

-- Improve the admin function to handle edge cases better
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin 
     FROM public.profiles 
     WHERE id = auth.uid() 
     LIMIT 1), 
    false  -- Explicitly return false for any null/missing cases
  );
$$;

-- Log this security enhancement
SELECT public.log_security_operation(
  'AUDIT_LOG_SECURITY_HARDENED',
  'security_audit_log',
  null,
  null,
  jsonb_build_object(
    'policies_added', array['admin_select', 'service_insert', 'deny_updates', 'service_delete', 'deny_user_modifications'],
    'security_level', 'maximum',
    'immutable', true
  )
);