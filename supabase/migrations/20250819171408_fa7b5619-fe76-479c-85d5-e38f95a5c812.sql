-- Phase 1: Critical Privilege Escalation Prevention (Fixed)

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
  TO service_role
  WITH CHECK (true);

CREATE POLICY "System can delete old audit logs"
  ON public.security_audit_log
  FOR DELETE
  TO service_role
  USING (true);

-- 5. Add input validation constraints
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_length CHECK (length(content) <= 2000);

ALTER TABLE public.score_submissions 
ADD CONSTRAINT score_submissions_message_length CHECK (length(message) <= 1000);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_length CHECK (length(username) <= 50);