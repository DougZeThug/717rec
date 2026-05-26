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
  lock_key bigint;
BEGIN
  -- Serialize concurrent checks for the same (endpoint, ip_hash) pair
  -- using a transaction-level advisory lock to prevent TOCTOU races.
  lock_key := hashtext(_endpoint || _ip_hash);
  PERFORM pg_advisory_xact_lock(lock_key);

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