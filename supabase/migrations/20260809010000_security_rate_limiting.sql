-- Geobooker Security Layer: Rate Limiting + Audit Log
-- Migration: 20260809010000
-- Applies: rate limiting table, audit log table, v_security_health view

BEGIN;

-- ============================================================
-- 1. RATE LIMITING TABLE
-- Tracks API calls per identifier (user_id or IP hash) per action
-- Used by: claim flow, checkout, international search
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier    TEXT NOT NULL,       -- auth.uid()::text or SHA-256 of IP
  action        TEXT NOT NULL,       -- 'claim_business', 'checkout', 'search_international'
  window_start  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  call_count    INTEGER NOT NULL DEFAULT 1,
  last_call_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.api_rate_limits(identifier, action, window_start);

-- RLS: users can only see their own rate limit entries
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limits_service_only
  ON public.api_rate_limits
  FOR ALL TO service_role
  USING (TRUE);

GRANT ALL ON public.api_rate_limits TO service_role;
-- Note: anon/authenticated should NOT have direct access; rate limiting
-- is enforced server-side via Netlify functions using the service role.

-- ============================================================
-- 2. RATE LIMIT HELPER FUNCTION
-- Returns TRUE if the action is within limits, FALSE if blocked
-- Call from Netlify functions via supabase.rpc('check_rate_limit', {...})
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier    TEXT,
  p_action        TEXT,
  p_max_calls     INTEGER DEFAULT 10,
  p_window_secs   INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INTEGER;
BEGIN
  -- Truncate to the window
  v_window_start := date_trunc('second', NOW()) -
    INTERVAL '1 second' * (EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_secs);

  -- Upsert: increment counter for this window
  INSERT INTO public.api_rate_limits (identifier, action, window_start, call_count, last_call_at)
  VALUES (p_identifier, p_action, v_window_start, 1, NOW())
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET
    call_count   = api_rate_limits.call_count + 1,
    last_call_at = NOW()
  RETURNING call_count INTO v_count;

  -- Return TRUE if within limit
  RETURN v_count <= p_max_calls;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- ============================================================
-- 3. SECURITY AUDIT LOG TABLE
-- Records the result of each monthly automated + manual audit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auditor          TEXT NOT NULL DEFAULT 'security-audit-cron',
  checks_passed    INTEGER NOT NULL DEFAULT 0,
  checks_failed    INTEGER NOT NULL DEFAULT 0,
  overall_severity TEXT NOT NULL DEFAULT 'info'
    CHECK (overall_severity IN ('info', 'low', 'medium', 'high', 'critical')),
  findings         JSONB NOT NULL DEFAULT '[]',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_service_only
  ON public.security_audit_log
  FOR ALL TO service_role
  USING (TRUE);

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE $p$
      CREATE POLICY audit_log_admin_read
        ON public.security_audit_log
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
    $p$;
  END IF;
END $$;

GRANT ALL ON public.security_audit_log TO service_role;

-- ============================================================
-- 4. SECURITY EVENTS TABLE
-- Required by v_security_health. The original alerting SQL also uses this
-- shape, but Preview branches only apply files under supabase/migrations.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  source text NOT NULL DEFAULT 'platform',
  route text,
  actor_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash text,
  user_agent text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'false_positive')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_detected
  ON public.security_events (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity_status
  ON public.security_events (severity, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON public.security_events (event_type, detected_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.security_events TO service_role;

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read security events" ON public.security_events';
    EXECUTE $p$
      CREATE POLICY "Admins can read security events"
      ON public.security_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.admin_users au
          WHERE au.id = auth.uid()
        )
      )
    $p$;
  END IF;
END $$;

-- ============================================================
-- 5. v_security_health VIEW
-- At-a-glance security status for the admin dashboard
-- ============================================================
CREATE OR REPLACE VIEW public.v_security_health AS
SELECT
  -- RLS coverage
  (
    SELECT COUNT(*)
    FROM pg_tables pt
    LEFT JOIN pg_class pc ON pc.relname = pt.tablename
    WHERE pt.schemaname = 'public'
      AND pc.relrowsecurity = FALSE
      AND pt.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
  ) AS tables_without_rls,

  -- Last audit result
  (SELECT overall_severity FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_severity,
  (SELECT audit_date FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_date,
  (SELECT checks_failed FROM public.security_audit_log ORDER BY audit_date DESC LIMIT 1) AS last_audit_failed,

  -- Critical security events in last 30 days
  (
    SELECT COUNT(*) FROM public.security_events
    WHERE severity IN ('critical', 'high')
      AND created_at > NOW() - INTERVAL '30 days'
  ) AS critical_events_30d,

  -- Rate limit hits in last 24h (potential bot activity)
  (
    SELECT COUNT(DISTINCT identifier)
    FROM public.api_rate_limits
    WHERE last_call_at > NOW() - INTERVAL '24 hours'
      AND call_count > 5
  ) AS rate_limited_identifiers_24h;

GRANT SELECT ON public.v_security_health TO service_role;

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.v_security_health TO authenticated';
  END IF;
END $$;

-- ============================================================
-- 6. CLEANUP: Remove rate limit entries older than 24 hours
-- (keeps the table lean; cron runs daily via check-outdated-businesses)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits TO service_role;

COMMIT;
