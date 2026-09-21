-- Read-only, privacy-minimized validation of recent WhatsApp consent confirmations.
WITH recent AS (
  SELECT
    id,
    status,
    requested_service,
    requested_marketing,
    confirmed_at,
    expires_at,
    contact_id,
    normalized_phone,
    created_at,
    updated_at
  FROM crm.whatsapp_consent_requests
  WHERE created_at >= now() - interval '2 hours'
  ORDER BY created_at DESC
  LIMIT 5
)
SELECT
  count(*) AS recent_requests,
  count(*) FILTER (WHERE status = 'pending_inbound') AS pending_requests,
  count(*) FILTER (WHERE status = 'confirmed') AS confirmed_requests,
  count(*) FILTER (WHERE requested_marketing) AS marketing_requested,
  count(*) FILTER (WHERE status = 'confirmed' AND requested_marketing) AS marketing_confirmed,
  count(*) FILTER (
    WHERE status = 'confirmed'
      AND confirmed_at IS NOT NULL
      AND contact_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM crm.contact_points cp
        WHERE cp.contact_id = recent.contact_id
          AND cp.point_type = 'whatsapp'
          AND cp.normalized_value = recent.normalized_phone
      )
  ) AS crm_links_complete,
  max(created_at) AS latest_requested_at,
  max(confirmed_at) AS latest_confirmed_at,
  bool_or(status = 'pending_inbound' AND expires_at > now()) AS has_live_pending_code
FROM recent;
