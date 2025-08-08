-- Security Fix: Implement admin privilege escalation protection
-- This migration adds triggers to prevent unauthorized admin privilege changes

-- First, ensure the prevent_admin_privilege_escalation trigger exists on profiles table
DROP TRIGGER IF EXISTS prevent_admin_privilege_escalation_trigger ON public.profiles;

CREATE TRIGGER prevent_admin_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_privilege_escalation();

-- Ensure the admin privilege change logging trigger exists on profiles table  
DROP TRIGGER IF EXISTS log_admin_privilege_change_trigger ON public.profiles;

CREATE TRIGGER log_admin_privilege_change_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_privilege_change();

-- Add additional security: Prevent INSERT of admin privileges by non-admins
CREATE OR REPLACE FUNCTION public.prevent_admin_privilege_escalation_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- If is_admin field is being set to true and user is not already an admin, block it
  IF (NEW.is_admin = true AND NOT current_user_is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can grant admin privileges';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for INSERT operations as well
DROP TRIGGER IF EXISTS prevent_admin_privilege_escalation_insert_trigger ON public.profiles;

CREATE TRIGGER prevent_admin_privilege_escalation_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_privilege_escalation_on_insert();

-- Log security operation
SELECT public.log_security_operation(
  'ADMIN_PRIVILEGE_PROTECTION_ENABLED',
  'profiles',
  null,
  null,
  '{"triggers_added": ["prevent_admin_privilege_escalation", "log_admin_privilege_change", "prevent_admin_privilege_escalation_insert"]}'::jsonb
);