-- Controlled Mexico WhatsApp marketing pilot gates.
-- Keeps evidenced opt-in mandatory and limits volume to 20 recipients/day.
-- Does not create audiences, jobs, messages or enable the global send secret.

INSERT INTO crm.market_policies (
  country_code,
  market_name,
  region,
  priority_cohort,
  market_status,
  whatsapp_marketing_enabled,
  requires_evidenced_opt_in,
  daily_recipient_cap,
  primary_language_code,
  primary_timezone,
  policy_notes,
  reviewed_at,
  source_metadata
) VALUES (
  'MX',
  'México',
  'North America',
  'launch_market',
  'pilot',
  true,
  true,
  20,
  'es_MX',
  'America/Mexico_City',
  'Piloto controlado: opt-in con evidencia obligatorio; no autoriza listas públicas, compradas ni scraping.',
  now(),
  jsonb_build_object(
    'decision', 'administrator_authorized_controlled_pilot',
    'daily_cap', 20,
    'sending_enabled_by_migration', false,
    'reviewed_at', now()
  )
)
ON CONFLICT (country_code) DO UPDATE SET
  market_name = EXCLUDED.market_name,
  region = EXCLUDED.region,
  priority_cohort = EXCLUDED.priority_cohort,
  market_status = 'pilot',
  whatsapp_marketing_enabled = true,
  requires_evidenced_opt_in = true,
  daily_recipient_cap = LEAST(crm.market_policies.daily_recipient_cap, 20),
  primary_language_code = 'es_MX',
  primary_timezone = 'America/Mexico_City',
  policy_notes = EXCLUDED.policy_notes,
  reviewed_at = COALESCE(crm.market_policies.reviewed_at, now()),
  source_metadata = crm.market_policies.source_metadata || EXCLUDED.source_metadata,
  updated_at = now();

UPDATE crm.whatsapp_rate_cards
SET
  status = 'active',
  source_checked_at = now(),
  updated_at = now()
WHERE country_code = 'MX'
  AND category = 'marketing'
  AND currency = 'MXN'
  AND unit_cost = 0.561400
  AND status = 'draft'
  AND effective_from <= now()
  AND (effective_to IS NULL OR effective_to > now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm.whatsapp_rate_cards
    WHERE country_code = 'MX'
      AND category = 'marketing'
      AND currency = 'MXN'
      AND unit_cost = 0.561400
      AND status = 'active'
      AND effective_from <= now()
      AND (effective_to IS NULL OR effective_to > now())
  ) THEN
    RAISE EXCEPTION 'active_mx_marketing_rate_required' USING ERRCODE = '22023';
  END IF;
END;
$$;

UPDATE crm.messaging_frequency_policies
SET
  minimum_interval_minutes = 10080,
  max_messages_24h = 1,
  max_messages_7d = 1,
  max_messages_30d = LEAST(max_messages_30d, 4),
  is_active = true,
  kill_switch = false,
  reviewed_at = now(),
  updated_at = now()
WHERE channel = 'whatsapp'
  AND purpose = 'marketing'
  AND policy_name = 'geobooker_whatsapp_marketing_v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm.messaging_frequency_policies
    WHERE channel = 'whatsapp'
      AND purpose = 'marketing'
      AND policy_name = 'geobooker_whatsapp_marketing_v1'
      AND is_active
      AND NOT kill_switch
      AND minimum_interval_minutes >= 10080
      AND max_messages_7d = 1
  ) THEN
    RAISE EXCEPTION 'controlled_marketing_frequency_policy_required' USING ERRCODE = '22023';
  END IF;
END;
$$;
