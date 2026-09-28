CREATE OR REPLACE FUNCTION public.is_username_taken(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = _username
      AND id IS DISTINCT FROM (SELECT auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION public.is_username_taken(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO authenticated, service_role;