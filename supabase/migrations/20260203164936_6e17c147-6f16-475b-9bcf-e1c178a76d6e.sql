-- Fix: Enforce user_id validation on messages INSERT policy
-- This prevents authenticated users from spoofing messages as other users

-- Drop the permissive policy that only checks authentication
DROP POLICY IF EXISTS "Authenticated can insert messages" ON messages;

-- Create policy that enforces user_id must match the authenticated user
CREATE POLICY "Authenticated can insert messages" ON messages
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());