-- Close the outbound CRM timeline gap and expose real-vs-sample message metrics.
-- Backend only: no anon/authenticated grants are introduced.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM crm.activities
    WHERE message_id IS NOT NULL
    GROUP BY message_id, activity_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_message_activities_must_be_reviewed';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_activities_message_type_uidx
  ON crm.activities (message_id, activity_type)
  WHERE message_id IS NOT NULL;

INSERT INTO crm.activities (
  account_id,
  contact_id,
  conversation_id,
  message_id,
  activity_type,
  summary,
  metadata,
  occurred_at
)
SELECT
  c.account_id,
  c.contact_id,
  m.conversation_id,
  m.id,
  'whatsapp_outbound',
  'Outbound WhatsApp message accepted by Meta',
  jsonb_build_object(
    'provider', 'meta_cloud',
    'status', m.current_status,
    'is_test', c.is_test
  ),
  COALESCE(
    (
      SELECT min(mse.provider_timestamp)
      FROM crm.message_status_events mse
      WHERE mse.message_id = m.id
        AND mse.status = 'accepted'
    ),
    m.updated_at,
    m.created_at
  )
FROM crm.messages m
JOIN crm.conversations c ON c.id = m.conversation_id
WHERE m.direction = 'outbound'
  AND m.provider_message_id IS NOT NULL
  AND m.current_status IN ('accepted', 'sent', 'delivered', 'read')
ON CONFLICT (message_id, activity_type) WHERE message_id IS NOT NULL DO NOTHING;

CREATE OR REPLACE FUNCTION crm.whatsapp_health_message_metrics(
  p_since TIMESTAMPTZ DEFAULT date_trunc('day', now())
)
RETURNS TABLE (
  real_messages INTEGER,
  sample_messages INTEGER,
  real_inbound INTEGER,
  real_outbound INTEGER,
  sample_inbound INTEGER,
  sample_outbound INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, crm
AS $$
  SELECT
    count(*) FILTER (WHERE c.is_test = FALSE)::INTEGER AS real_messages,
    count(*) FILTER (WHERE c.is_test = TRUE)::INTEGER AS sample_messages,
    count(*) FILTER (WHERE c.is_test = FALSE AND m.direction = 'inbound')::INTEGER AS real_inbound,
    count(*) FILTER (WHERE c.is_test = FALSE AND m.direction = 'outbound')::INTEGER AS real_outbound,
    count(*) FILTER (WHERE c.is_test = TRUE AND m.direction = 'inbound')::INTEGER AS sample_inbound,
    count(*) FILTER (WHERE c.is_test = TRUE AND m.direction = 'outbound')::INTEGER AS sample_outbound
  FROM crm.messages m
  JOIN crm.conversations c ON c.id = m.conversation_id
  WHERE m.created_at >= p_since;
$$;

REVOKE ALL ON FUNCTION crm.whatsapp_health_message_metrics(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crm.whatsapp_health_message_metrics(TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION crm.whatsapp_health_message_metrics(TIMESTAMPTZ) IS
  'Backend-only WhatsApp message counts split between real CRM traffic and isolated Meta samples.';
