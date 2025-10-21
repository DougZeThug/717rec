-- ============================================
-- FIX: Correct RLS policies to use current_user_is_admin()
-- This fixes admin lock-out for bracket creation/deletion
-- ============================================

-- Fix brackets table policies
DROP POLICY IF EXISTS "Admin full access for INSERT" ON brackets;
DROP POLICY IF EXISTS "Admin full access for DELETE" ON brackets;
DROP POLICY IF EXISTS "Admin full access for UPDATE" ON brackets;

CREATE POLICY "Admins can insert brackets" ON brackets
FOR INSERT 
TO authenticated
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete brackets" ON brackets
FOR DELETE 
TO authenticated
USING (current_user_is_admin());

CREATE POLICY "Admins can update brackets" ON brackets
FOR UPDATE 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Fix divisions table policies (was overly permissive)
DROP POLICY IF EXISTS "Admin full access" ON divisions;
DROP POLICY IF EXISTS "Authenticated insert access" ON divisions;

CREATE POLICY "Admins can manage divisions" ON divisions
FOR ALL 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());