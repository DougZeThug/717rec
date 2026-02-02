-- Fix seasons table RLS policies to restrict write operations to admins only
-- Currently any authenticated user can create, modify, or delete seasons

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage seasons" ON seasons;
DROP POLICY IF EXISTS "Admins can manage seasons" ON seasons;

-- Keep the read policies (they're fine)
-- "Anyone can view seasons" and "Authenticated users can read seasons" allow public read access

-- Create admin-only write policies using the existing current_user_is_admin() function
CREATE POLICY "Admins can insert seasons" ON seasons
FOR INSERT TO authenticated
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can update seasons" ON seasons
FOR UPDATE TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete seasons" ON seasons
FOR DELETE TO authenticated
USING (current_user_is_admin());