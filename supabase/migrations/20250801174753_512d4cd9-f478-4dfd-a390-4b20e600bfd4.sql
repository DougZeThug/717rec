-- CRITICAL SECURITY FIX: Admin Privilege Escalation Prevention

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

-- Create admin privilege change logging table
CREATE TABLE IF NOT EXISTS public.admin_privilege_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  changed_by_user_id UUID,
  old_admin_status BOOLEAN,
  new_admin_status BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin privilege changes
ALTER TABLE public.admin_privilege_changes ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin privilege changes
CREATE POLICY "Only admins can view admin privilege changes"
ON public.admin_privilege_changes
FOR SELECT
USING (current_user_is_admin());

-- Create trigger function to log admin privilege changes
CREATE OR REPLACE FUNCTION public.log_admin_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if is_admin field changed
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin privilege changes
DROP TRIGGER IF EXISTS trigger_log_admin_privilege_change ON public.profiles;
CREATE TRIGGER trigger_log_admin_privilege_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_privilege_change();

-- Drop existing problematic policies on profiles table
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create secure RLS policies for profiles table
-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (current_user_is_admin());

-- Users can update their own profile (admin privilege changes will be blocked by separate policy)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Block non-admin users from changing is_admin field through a separate function
CREATE OR REPLACE FUNCTION public.prevent_admin_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If is_admin field is being changed and user is not already an admin, block it
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin AND NOT current_user_is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can modify admin privileges';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent admin privilege escalation
DROP TRIGGER IF EXISTS trigger_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_privilege_escalation();