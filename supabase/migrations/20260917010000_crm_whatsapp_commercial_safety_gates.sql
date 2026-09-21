-- WhatsApp commercial safety gates: versioned rates, currency budgets and
-- per-contact frequency caps. Additive and fail-closed. This migration never
-- enables sending, creates outbound jobs or calls Meta.

CREATE TABLE IF NOT EXISTS crm.whatsapp_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  rate_card_version TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication', 'service')),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  unit_cost NUMERIC(14, 6) NOT NULL CHECK (unit_cost >= 0),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  source_url TEXT NOT NULL,
  source_checked_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE (provider, rate_card_version, country_code, category)
);

CREATE TABLE IF NOT EXISTS crm.messaging_frequency_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  purpose TEXT NOT NULL CHECK (purpose IN ('marketing', 'transactional', 'service')),
  policy_name TEXT NOT NULL,
  minimum_interval_minutes INTEGER NOT NULL DEFAULT 0 CHECK (minimum_interval_minutes >= 0),
  max_messages_24h INTEGER NOT NULL CHECK (max_messages_24h > 0),
  max_messages_7d INTEGER NOT NULL CHECK (max_messages_7d > 0),
  max_messages_30d INTEGER NOT NULL CHECK (max_messages_30d > 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_messages_24h <= max_messages_7d AND max_messages_7d <= max_messages_30d),
  UNIQUE (channel, purpose, policy_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_frequency_policy_active_uidx
  ON crm.messaging_frequency_policies (channel, purpose)
  WHERE is_active;
CREATE INDEX IF NOT EXISTS crm_whatsapp_rate_cards_lookup_idx
  ON crm.whatsapp_rate_cards (country_code, category, status, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS crm_messages_frequency_guard_idx
  ON crm.messages (direction, current_status, created_at DESC, conversation_id);

ALTER TABLE crm.usage_ledger
  ADD COLUMN IF NOT EXISTS rate_card_id UUID REFERENCES crm.whatsapp_rate_cards(id) ON DELETE RESTRICT;

ALTER TABLE crm.whatsapp_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.whatsapp_rate_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.messaging_frequency_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.messaging_frequency_policies FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE crm.whatsapp_rate_cards FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE crm.messaging_frequency_policies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.whatsapp_rate_cards TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE crm.messaging_frequency_policies TO service_role;
REVOKE DELETE ON TABLE crm.whatsapp_rate_cards FROM service_role;
REVOKE DELETE ON TABLE crm.messaging_frequency_policies FROM service_role;

DROP TRIGGER IF EXISTS set_updated_at ON crm.whatsapp_rate_cards;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.whatsapp_rate_cards
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON crm.messaging_frequency_policies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON crm.messaging_frequency_policies
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- Conservative placeholders. They remain disabled and kill-switched until an
-- administrator reviews them; their existence cannot enable delivery.
INSERT INTO crm.messaging_frequency_policies (
  channel, purpose, policy_name, minimum_interval_minutes,
  max_messages_24h, max_messages_7d, max_messages_30d,
  is_active, kill_switch
)
VALUES
  ('whatsapp', 'marketing', 'geobooker_whatsapp_marketing_v1', 1440, 1, 3, 8, false, true),
  ('whatsapp', 'transactional', 'geobooker_whatsapp_transactional_v1', 60, 5, 15, 40, false, true),
  ('whatsapp', 'service', 'geobooker_whatsapp_service_v1', 0, 20, 60, 120, false, true)
ON CONFLICT (channel, purpose, policy_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_outbound_guard(
  p_contact_id UUID,
  p_country_code TEXT,
  p_category TEXT,
  p_purpose TEXT,
  p_exclude_message_id UUID DEFAULT NULL,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  allowed BOOLEAN,
  reasons JSONB,
  currency TEXT,
  estimated_unit_cost NUMERIC,
  rate_card_version TEXT,
  rate_card_id UUID,
  daily_spend NUMERIC,
  monthly_spend NUMERIC,
  messages_24h INTEGER,
  messages_7d INTEGER,
  messages_30d INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  budget_record RECORD;
  rate_record RECORD;
  frequency_record RECORD;
  daily_spend_value NUMERIC := 0;
  monthly_spend_value NUMERIC := 0;
  messages_24h_value INTEGER := 0;
  messages_7d_value INTEGER := 0;
  messages_30d_value INTEGER := 0;
  last_outbound_at TIMESTAMPTZ;
  reason_list JSONB := '[]'::jsonb;
  normalized_country TEXT := upper(NULLIF(btrim(COALESCE(p_country_code, '')), ''));
  normalized_category TEXT := lower(NULLIF(btrim(COALESCE(p_category, '')), ''));
  normalized_purpose TEXT := lower(NULLIF(btrim(COALESCE(p_purpose, '')), ''));
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_contact_id IS NULL OR normalized_category NOT IN ('marketing', 'utility', 'authentication', 'service')
    OR normalized_purpose NOT IN ('marketing', 'transactional', 'service') THEN
    RAISE EXCEPTION 'invalid_guard_input' USING ERRCODE = '22023';
  END IF;

  SELECT bp.* INTO budget_record
  FROM crm.budget_policies bp
  WHERE bp.provider = 'meta_cloud' AND bp.is_active
  ORDER BY bp.updated_at DESC
  LIMIT 1;

  SELECT rc.* INTO rate_record
  FROM crm.whatsapp_rate_cards rc
  WHERE normalized_country IS NOT NULL
    AND rc.provider = 'meta_cloud'
    AND rc.country_code = normalized_country
    AND rc.category = normalized_category
    AND rc.status = 'active'
    AND rc.effective_from <= p_now
    AND (rc.effective_to IS NULL OR rc.effective_to > p_now)
  ORDER BY rc.effective_from DESC, rc.created_at DESC
  LIMIT 1;

  SELECT fp.* INTO frequency_record
  FROM crm.messaging_frequency_policies fp
  WHERE fp.channel = 'whatsapp'
    AND fp.purpose = normalized_purpose
    AND fp.is_active
  ORDER BY fp.updated_at DESC
  LIMIT 1;

  SELECT
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= date_trunc('day', p_now)), 0),
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= date_trunc('month', p_now)), 0)
  INTO daily_spend_value, monthly_spend_value
  FROM crm.usage_ledger ul
  WHERE budget_record.currency IS NOT NULL
    AND ul.currency = budget_record.currency;

  SELECT
    count(*) FILTER (WHERE m.created_at >= p_now - interval '24 hours')::integer,
    count(*) FILTER (WHERE m.created_at >= p_now - interval '7 days')::integer,
    count(*) FILTER (WHERE m.created_at >= p_now - interval '30 days')::integer,
    max(m.created_at)
  INTO messages_24h_value, messages_7d_value, messages_30d_value, last_outbound_at
  FROM crm.messages m
  JOIN crm.conversations c ON c.id = m.conversation_id
  WHERE c.contact_id = p_contact_id
    AND m.direction = 'outbound'
    AND m.current_status NOT IN ('failed', 'deleted')
    AND (p_exclude_message_id IS NULL OR m.id <> p_exclude_message_id)
    AND m.created_at >= p_now - interval '30 days';

  IF budget_record.id IS NULL THEN
    reason_list := reason_list || '["active_budget_policy_required"]'::jsonb;
  ELSIF COALESCE(budget_record.kill_switch, true) THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;
  IF budget_record.id IS NOT NULL AND budget_record.daily_limit IS NULL THEN
    reason_list := reason_list || '["daily_budget_limit_required"]'::jsonb;
  END IF;
  IF budget_record.id IS NOT NULL AND budget_record.monthly_limit IS NULL THEN
    reason_list := reason_list || '["monthly_budget_limit_required"]'::jsonb;
  END IF;
  IF normalized_country IS NULL OR normalized_country !~ '^[A-Z]{2}$' THEN
    reason_list := reason_list || '["recipient_country_required"]'::jsonb;
  ELSIF rate_record.id IS NULL THEN
    reason_list := reason_list || '["active_rate_card_required"]'::jsonb;
  END IF;
  IF budget_record.id IS NOT NULL AND rate_record.id IS NOT NULL
    AND budget_record.currency <> rate_record.currency THEN
    reason_list := reason_list || '["budget_rate_currency_mismatch"]'::jsonb;
  END IF;
  IF frequency_record.id IS NULL THEN
    reason_list := reason_list || '["active_frequency_policy_required"]'::jsonb;
  ELSIF COALESCE(frequency_record.kill_switch, true) THEN
    reason_list := reason_list || '["frequency_kill_switch_enabled"]'::jsonb;
  ELSE
    IF COALESCE(messages_24h_value, 0) >= frequency_record.max_messages_24h THEN
      reason_list := reason_list || '["frequency_cap_24h_reached"]'::jsonb;
    END IF;
    IF COALESCE(messages_7d_value, 0) >= frequency_record.max_messages_7d THEN
      reason_list := reason_list || '["frequency_cap_7d_reached"]'::jsonb;
    END IF;
    IF COALESCE(messages_30d_value, 0) >= frequency_record.max_messages_30d THEN
      reason_list := reason_list || '["frequency_cap_30d_reached"]'::jsonb;
    END IF;
    IF frequency_record.minimum_interval_minutes > 0
      AND last_outbound_at IS NOT NULL
      AND last_outbound_at > p_now - make_interval(mins => frequency_record.minimum_interval_minutes) THEN
      reason_list := reason_list || '["minimum_contact_interval_not_elapsed"]'::jsonb;
    END IF;
  END IF;
  IF budget_record.id IS NOT NULL AND rate_record.id IS NOT NULL THEN
    IF budget_record.daily_limit IS NOT NULL
      AND COALESCE(daily_spend_value, 0) + rate_record.unit_cost > budget_record.daily_limit THEN
      reason_list := reason_list || '["daily_budget_exceeded"]'::jsonb;
    END IF;
    IF budget_record.monthly_limit IS NOT NULL
      AND COALESCE(monthly_spend_value, 0) + rate_record.unit_cost > budget_record.monthly_limit THEN
      reason_list := reason_list || '["monthly_budget_exceeded"]'::jsonb;
    END IF;
  END IF;

  RETURN QUERY SELECT
    jsonb_array_length(reason_list) = 0,
    reason_list,
    rate_record.currency,
    rate_record.unit_cost,
    rate_record.rate_card_version,
    rate_record.id,
    COALESCE(daily_spend_value, 0)::numeric,
    COALESCE(monthly_spend_value, 0)::numeric,
    COALESCE(messages_24h_value, 0)::integer,
    COALESCE(messages_7d_value, 0)::integer,
    COALESCE(messages_30d_value, 0)::integer;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_outbound_guard(UUID, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_outbound_guard(UUID, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ)
  TO service_role;

COMMENT ON TABLE crm.whatsapp_rate_cards IS
  'Versioned provider rate cards. No price is active until explicitly reviewed and activated.';
COMMENT ON TABLE crm.messaging_frequency_policies IS
  'Fail-closed per-contact frequency limits. Seed policies are disabled and kill-switched.';
COMMENT ON FUNCTION public.crm_whatsapp_outbound_guard(UUID, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) IS
  'Service-role-only budget, rate-card and frequency guard. It sends nothing.';
