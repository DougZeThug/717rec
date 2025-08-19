-- Phase 1: Critical Privilege Escalation Prevention

-- 1. Add missing triggers for admin privilege escalation on profiles table
CREATE TRIGGER prevent_admin_privilege_escalation_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_privilege_escalation_on_insert();

CREATE TRIGGER prevent_admin_privilege_escalation_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_privilege_escalation();

-- 2. Tighten RLS policies on sensitive tables

-- Fix messages table - require authentication for reading messages
DROP POLICY IF EXISTS "Allow anyone to read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can read messages" ON public.messages;

CREATE POLICY "Authenticated users can read messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Add proper INSERT policy for messages (users can only insert their own messages)
CREATE POLICY "Users can insert their own messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Strengthen score submissions - require user context
DROP POLICY IF EXISTS "Allow anonymous score submissions" ON public.score_submissions;

CREATE POLICY "Users can submit score reports"
  ON public.score_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Improve security audit log policies - ensure only service role can write
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Service role can delete audit logs" ON public.security_audit_log;

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_log
  FOR INSERT
  USING (auth.role() = 'service_role');

CREATE POLICY "System can delete old audit logs"
  ON public.security_audit_log
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 5. Add input validation constraints
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_length CHECK (length(content) <= 2000);

ALTER TABLE public.score_submissions 
ADD CONSTRAINT score_submissions_message_length CHECK (length(message) <= 1000);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_length CHECK (length(username) <= 50);

-- 6. Add rate limiting table for future use
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

-- 7. Enhance admin privilege change logging
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