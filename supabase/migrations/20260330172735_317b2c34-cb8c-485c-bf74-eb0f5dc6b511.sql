-- Prevent users from escalating their own admin privileges
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);