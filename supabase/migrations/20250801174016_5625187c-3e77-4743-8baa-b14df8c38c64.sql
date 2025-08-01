-- CRITICAL SECURITY FIX: Admin Privilege Escalation Prevention

-- First, let's create a security definer function to check if current user is admin
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
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
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

-- Users can update their own profile EXCEPT is_admin field
CREATE POLICY "Users can update their own profile (non-admin fields)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- If is_admin is being changed, only allow if current user is admin
    (OLD.is_admin IS DISTINCT FROM NEW.is_admin AND current_user_is_admin())
    OR 
    -- If is_admin is not being changed, allow the update
    (OLD.is_admin IS NOT DISTINCT FROM NEW.is_admin)
  )
);

-- Only admins can grant/revoke admin privileges
CREATE POLICY "Only admins can modify admin status"
ON public.profiles
FOR UPDATE
USING (
  current_user_is_admin() 
  AND OLD.is_admin IS DISTINCT FROM NEW.is_admin
)
WITH CHECK (
  current_user_is_admin()
);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (current_user_is_admin());