CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
  ON public.rate_limit_events (endpoint, ip_hash, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only service_role (bypasses RLS) can read/write.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _endpoint text,
  _ip_hash text,
  _window_seconds int,
  _max_hits int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hits int;
BEGIN
  -- Opportunistic GC of rows older than 1 day
  DELETE FROM public.rate_limit_events
   WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO hits
    FROM public.rate_limit_events
   WHERE endpoint = _endpoint
     AND ip_hash = _ip_hash
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF hits >= _max_hits THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events(endpoint, ip_hash) VALUES (_endpoint, _ip_hash);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, int) TO service_role;