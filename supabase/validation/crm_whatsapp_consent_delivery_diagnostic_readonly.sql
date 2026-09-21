-- Read-only diagnostic for the latest WhatsApp consent request and inbound delivery.
WITH latest_request AS (
  SELECT *
  FROM crm.whatsapp_consent_requests
  WHERE created_at >= now() - interval '4 hours'
  ORDER BY created_at DESC
  LIMIT 1
), matching_point AS (
  SELECT cp.*
  FROM crm.contact_points cp
  JOIN latest_request r ON cp.normalized_value = r.normalized_phone
  WHERE cp.point_type = 'whatsapp'
  ORDER BY cp.updated_at DESC
  LIMIT 1
), recent_inbound AS (
  SELECT m.*, cp.normalized_value AS sender_phone
  FROM crm.messages m
  JOIN crm.conversations c ON c.id = m.conversation_id
  JOIN crm.contact_points cp ON cp.id = c.contact_point_id
  CROSS JOIN latest_request r
  WHERE m.direction = 'inbound'
    AND m.created_at >= r.created_at - interval '5 minutes'
  ORDER BY m.created_at DESC
  LIMIT 1
), recent_event AS (
  SELECT we.*
  FROM crm.webhook_events we
  WHERE we.received_at >= (SELECT created_at - interval '5 minutes' FROM latest_request)
  ORDER BY we.received_at DESC
  LIMIT 1
)
SELECT
  EXISTS (SELECT 1 FROM latest_request) AS request_exists,
  (SELECT status FROM latest_request) AS request_status,
  COALESCE((SELECT requested_marketing FROM latest_request), false) AS marketing_requested,
  (SELECT expires_at > now() FROM latest_request) AS request_not_expired,
  (SELECT confirmed_at IS NOT NULL FROM latest_request) AS confirmed,
  EXISTS (SELECT 1 FROM matching_point) AS contact_point_exists,
  EXISTS (SELECT 1 FROM recent_inbound) AS matching_inbound_persisted,
  COALESCE((
    SELECT i.sender_phone = r.normalized_phone
    FROM recent_inbound i CROSS JOIN latest_request r
  ), false) AS sender_exactly_matches_request,
  COALESCE((
    SELECT regexp_replace(i.sender_phone, '[^0-9]', '', 'g') = regexp_replace(r.normalized_phone, '[^0-9]', '', 'g')
      OR right(regexp_replace(i.sender_phone, '[^0-9]', '', 'g'), 10) = right(regexp_replace(r.normalized_phone, '[^0-9]', '', 'g'), 10)
    FROM recent_inbound i CROSS JOIN latest_request r
  ), false) AS sender_matches_request,
  COALESCE((SELECT upper(btrim(body_text)) LIKE 'CONFIRMAR GEOBOOKER %' FROM recent_inbound), false) AS has_confirmation_prefix,
  COALESCE((SELECT upper(btrim(body_text)) ~ '^CONFIRMAR GEOBOOKER [A-Z0-9]{10}$' FROM recent_inbound), false) AS confirmation_shape_valid,
  (SELECT message_type FROM recent_inbound) AS inbound_message_type,
  (SELECT current_status FROM recent_inbound) AS inbound_status,
  (SELECT created_at FROM recent_inbound) AS inbound_created_at,
  EXISTS (SELECT 1 FROM recent_event) AS recent_webhook_exists,
  COALESCE((SELECT signature_verified FROM recent_event), false) AS latest_webhook_signature_valid,
  (SELECT processing_status FROM recent_event) AS latest_webhook_processing_status,
  (SELECT event_type FROM recent_event) AS latest_webhook_event_type,
  (SELECT received_at FROM recent_event) AS latest_webhook_received_at,
  (SELECT last_error FROM recent_event) AS latest_webhook_error;
