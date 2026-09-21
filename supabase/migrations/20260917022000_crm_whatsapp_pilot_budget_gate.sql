-- Pilot budget and global daily-volume gate.
-- Additive and fail-closed: this migration does not activate rates, policies,
-- templates or sending and never creates outbound jobs.

ALTER TABLE crm.budget_policies
  ADD COLUMN IF NOT EXISTS daily_message_limit INTEGER CHECK (daily_message_limit IS NULL OR daily_message_limit > 0),
  ADD COLUMN IF NOT EXISTS warning_percent NUMERIC(5, 2) NOT NULL DEFAULT 50 CHECK (warning_percent > 0 AND warning_percent < 100),
  ADD COLUMN IF NOT EXISTS high_warning_percent NUMERIC(5, 2) NOT NULL DEFAULT 80 CHECK (high_warning_percent > 0 AND high_warning_percent < 100),
  ADD COLUMN IF NOT EXISTS hard_block_percent NUMERIC(5, 2) NOT NULL DEFAULT 100 CHECK (hard_block_percent = 100),
  ADD COLUMN IF NOT EXISTS timezone_name TEXT NOT NULL DEFAULT 'America/Mexico_City';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'crm_budget_warning_order_check'
      AND conrelid = 'crm.budget_policies'::regclass
  ) THEN
    ALTER TABLE crm.budget_policies
      ADD CONSTRAINT crm_budget_warning_order_check
      CHECK (warning_percent < high_warning_percent AND high_warning_percent < hard_block_percent);
  END IF;
END;
$$;

INSERT INTO crm.budget_policies (
  policy_name, provider, currency, daily_limit, monthly_limit,
  daily_message_limit, warning_percent, high_warning_percent,
  hard_block_percent, timezone_name, is_active, kill_switch
)
VALUES (
  'geobooker_whatsapp_pilot_mx_v1', 'meta_cloud', 'MXN', 1000.0000,
  1000.0000, 20, 50, 80, 100, 'America/Mexico_City', false, true
)
ON CONFLICT (policy_name) DO UPDATE SET
  currency = EXCLUDED.currency,
  daily_limit = EXCLUDED.daily_limit,
  monthly_limit = EXCLUDED.monthly_limit,
  daily_message_limit = EXCLUDED.daily_message_limit,
  warning_percent = EXCLUDED.warning_percent,
  high_warning_percent = EXCLUDED.high_warning_percent,
  hard_block_percent = EXCLUDED.hard_block_percent,
  timezone_name = EXCLUDED.timezone_name,
  is_active = false,
  kill_switch = true,
  updated_at = now();

-- One proactive marketing message per seven days per contact. It remains
-- inactive and kill-switched until the allowlisted pilot is approved.
UPDATE crm.messaging_frequency_policies
SET minimum_interval_minutes = 10080,
    max_messages_24h = 1,
    max_messages_7d = 1,
    max_messages_30d = 4,
    is_active = false,
    kill_switch = true,
    reviewed_at = NULL,
    reviewed_by_user_id = NULL,
    updated_at = now()
WHERE channel = 'whatsapp'
  AND purpose = 'marketing'
  AND policy_name = 'geobooker_whatsapp_marketing_v1';

CREATE OR REPLACE FUNCTION public.crm_whatsapp_global_daily_gate(
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  allowed BOOLEAN,
  reasons JSONB,
  messages_today INTEGER,
  daily_message_limit INTEGER,
  daily_spend NUMERIC,
  monthly_spend NUMERIC,
  monthly_limit NUMERIC,
  utilization_percent NUMERIC,
  alert_level TEXT,
  checked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  budget_record RECORD;
  day_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
  global_message_count INTEGER := 0;
  daily_spend_value NUMERIC := 0;
  monthly_spend_value NUMERIC := 0;
  utilization_value NUMERIC := 0;
  alert_value TEXT := 'none';
  reason_list JSONB := '[]'::jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT bp.* INTO budget_record
  FROM crm.budget_policies bp
  WHERE bp.provider = 'meta_cloud' AND bp.is_active
  ORDER BY bp.updated_at DESC
  LIMIT 1;

  IF budget_record.id IS NULL THEN
    reason_list := reason_list || '["active_budget_policy_required"]'::jsonb;
    RETURN QUERY SELECT false, reason_list, 0, NULL::integer, 0::numeric,
      0::numeric, NULL::numeric, 0::numeric, 'blocked'::text, p_now;
    RETURN;
  END IF;

  day_start := date_trunc('day', p_now AT TIME ZONE budget_record.timezone_name)
    AT TIME ZONE budget_record.timezone_name;
  month_start := date_trunc('month', p_now AT TIME ZONE budget_record.timezone_name)
    AT TIME ZONE budget_record.timezone_name;

  SELECT count(*)::integer INTO global_message_count
  FROM crm.messages m
  WHERE m.direction = 'outbound'
    AND m.current_status NOT IN ('failed', 'deleted')
    AND m.created_at >= day_start;

  SELECT
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= day_start), 0),
    COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity)
      FILTER (WHERE ul.created_at >= month_start), 0)
  INTO daily_spend_value, monthly_spend_value
  FROM crm.usage_ledger ul
  WHERE ul.currency = budget_record.currency;

  IF COALESCE(budget_record.kill_switch, true) THEN
    reason_list := reason_list || '["budget_kill_switch_enabled"]'::jsonb;
  END IF;
  IF budget_record.daily_message_limit IS NULL THEN
    reason_list := reason_list || '["daily_message_limit_required"]'::jsonb;
  ELSIF global_message_count >= budget_record.daily_message_limit THEN
    reason_list := reason_list || '["global_daily_message_limit_reached"]'::jsonb;
  END IF;
  IF budget_record.monthly_limit IS NULL OR budget_record.monthly_limit <= 0 THEN
    reason_list := reason_list || '["monthly_budget_limit_required"]'::jsonb;
  ELSE
    utilization_value := round((monthly_spend_value / budget_record.monthly_limit) * 100, 2);
    IF utilization_value >= budget_record.hard_block_percent THEN
      reason_list := reason_list || '["monthly_budget_exceeded"]'::jsonb;
      alert_value := 'hard_block';
    ELSIF utilization_value >= budget_record.high_warning_percent THEN
      alert_value := 'high_warning';
    ELSIF utilization_value >= budget_record.warning_percent THEN
      alert_value := 'warning';
    END IF;
  END IF;

  RETURN QUERY SELECT
    jsonb_array_length(reason_list) = 0,
    reason_list,
    global_message_count,
    budget_record.daily_message_limit,
    daily_spend_value,
    monthly_spend_value,
    budget_record.monthly_limit,
    utilization_value,
    alert_value,
    p_now;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_global_daily_gate(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_global_daily_gate(TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.crm_whatsapp_global_daily_gate(TIMESTAMPTZ) IS
  'Service-role-only global daily volume and budget alert gate. It sends nothing.';

