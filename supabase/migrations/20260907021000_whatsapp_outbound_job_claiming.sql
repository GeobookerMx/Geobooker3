-- Atomic claim helper for the WhatsApp outbound worker.
--
-- This does not enable sending. It only lets a backend/service-role worker claim
-- queued jobs without two executions processing the same message.

CREATE OR REPLACE FUNCTION crm.claim_whatsapp_outbound_jobs(
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF crm.outbound_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  safe_limit INTEGER;
BEGIN
  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM crm.outbound_jobs
    WHERE status IN ('pending', 'retry')
      AND scheduled_at <= now()
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
      AND attempt_count < max_attempts
    ORDER BY COALESCE(next_attempt_at, scheduled_at), created_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT safe_limit
  )
  UPDATE crm.outbound_jobs AS job
  SET
    status = 'processing',
    locked_at = now(),
    attempt_count = job.attempt_count + 1,
    updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION crm.claim_whatsapp_outbound_jobs(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.claim_whatsapp_outbound_jobs(INTEGER)
  TO service_role;

COMMENT ON FUNCTION crm.claim_whatsapp_outbound_jobs(INTEGER) IS
  'Claims pending/retry WhatsApp outbound jobs atomically for a service-role worker.';
