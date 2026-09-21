-- Stage 1 of the controlled WhatsApp pilot.
-- Enables only the database-side guardrails required to reply to a customer-
-- initiated message inside the 24-hour service window. The outer environment
-- kill switch WHATSAPP_SEND_ENABLED remains false and no job/message is created.

-- Meta states that service messages inside the customer-service window are
-- free. Keep the evidence URL and review timestamp with the zero-cost rate.
INSERT INTO crm.whatsapp_rate_cards (
  provider, rate_card_version, country_code, category, currency, unit_cost,
  effective_from, effective_to, source_url, source_checked_at, status
)
VALUES (
  'meta_cloud', 'meta-service-free-observed-2026-09-17-v1', 'MX', 'service',
  'MXN', 0.000000, '2026-09-17 00:00:00+00', NULL,
  'https://whatsappbusiness.com/es-la/products/platform-pricing/',
  '2026-09-17 00:00:00+00', 'active'
)
ON CONFLICT (provider, rate_card_version, country_code, category) DO UPDATE SET
  currency = EXCLUDED.currency,
  unit_cost = EXCLUDED.unit_cost,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  source_url = EXCLUDED.source_url,
  source_checked_at = EXCLUDED.source_checked_at,
  status = 'active',
  updated_at = now();

-- Make this the only active Meta budget policy. Limits remain 20 messages/day
-- and MXN 1,000/month. This does not override WHATSAPP_SEND_ENABLED=false.
UPDATE crm.budget_policies
SET is_active = false,
    kill_switch = true,
    updated_at = now()
WHERE provider = 'meta_cloud'
  AND policy_name <> 'geobooker_whatsapp_pilot_mx_v1';

UPDATE crm.budget_policies
SET is_active = true,
    kill_switch = false,
    daily_message_limit = 20,
    monthly_limit = 1000.0000,
    currency = 'MXN',
    updated_at = now()
WHERE policy_name = 'geobooker_whatsapp_pilot_mx_v1';

-- Enable only customer-initiated service replies. Marketing and transactional
-- policies remain kill-switched and all campaign templates remain disabled.
UPDATE crm.messaging_frequency_policies
SET is_active = false,
    kill_switch = true,
    updated_at = now()
WHERE channel = 'whatsapp'
  AND purpose IN ('marketing', 'transactional');

UPDATE crm.messaging_frequency_policies
SET minimum_interval_minutes = 0,
    max_messages_24h = 20,
    max_messages_7d = 60,
    max_messages_30d = 120,
    is_active = true,
    kill_switch = false,
    reviewed_at = now(),
    updated_at = now()
WHERE channel = 'whatsapp'
  AND purpose = 'service'
  AND policy_name = 'geobooker_whatsapp_service_v1';

-- Explicitly preserve the campaign gate during the service pilot.
UPDATE crm.whatsapp_templates
SET enabled_for_campaigns = false,
    updated_at = now()
WHERE enabled_for_campaigns = true;

