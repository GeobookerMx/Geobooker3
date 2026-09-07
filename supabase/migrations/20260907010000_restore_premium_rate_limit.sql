-- Restore the server-side rate limiter required by Premium activation.
-- This intentionally excludes unrelated objects from the historical migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  call_count integer NOT NULL DEFAULT 1 CHECK (call_count > 0),
  last_call_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_rate_limits_identifier_action_window_uidx
  ON public.api_rate_limits (identifier, action, window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_limits_service_only ON public.api_rate_limits;
CREATE POLICY rate_limits_service_only
  ON public.api_rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_calls integer DEFAULT 10,
  p_window_secs integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF nullif(btrim(p_identifier), '') IS NULL
     OR nullif(btrim(p_action), '') IS NULL
     OR p_max_calls < 1 OR p_max_calls > 10000
     OR p_window_secs < 1 OR p_window_secs > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  v_window_start := date_trunc('second', clock_timestamp())
    - make_interval(secs => mod(extract(epoch FROM clock_timestamp())::integer, p_window_secs));

  INSERT INTO public.api_rate_limits (
    identifier, action, window_start, call_count, last_call_at
  )
  VALUES (btrim(p_identifier), btrim(p_action), v_window_start, 1, clock_timestamp())
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET
    call_count = public.api_rate_limits.call_count + 1,
    last_call_at = clock_timestamp()
  RETURNING call_count INTO v_count;

  RETURN v_count <= p_max_calls;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  TO service_role;

COMMENT ON TABLE public.api_rate_limits IS
  'Server-only counters used by backend functions to enforce API rate limits.';
COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS
  'Atomically increments a server-side rate-limit bucket and returns whether it remains allowed.';

NOTIFY pgrst, 'reload schema';

COMMIT;
