-- WhatsApp Campaign Wizard V2.
-- Additive, fail-closed and no-send. It never queues jobs or calls Meta.

ALTER TABLE crm.campaigns
  ADD COLUMN IF NOT EXISTS campaign_goal TEXT,
  ADD COLUMN IF NOT EXISTS language_code TEXT,
  ADD COLUMN IF NOT EXISTS timezone_name TEXT,
  ADD COLUMN IF NOT EXISTS estimated_recipient_count INTEGER CHECK (estimated_recipient_count IS NULL OR estimated_recipient_count >= 0),
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(14, 4) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  ADD COLUMN IF NOT EXISTS cost_currency TEXT CHECK (cost_currency IS NULL OR cost_currency ~ '^[A-Z]{3}$');

ALTER TABLE crm.campaign_members
  ADD COLUMN IF NOT EXISTS recipient_country_code TEXT CHECK (recipient_country_code IS NULL OR recipient_country_code ~ '^[A-Z]{2}$'),
  ADD COLUMN IF NOT EXISTS language_code TEXT,
  ADD COLUMN IF NOT EXISTS estimated_unit_cost NUMERIC(14, 6) CHECK (estimated_unit_cost IS NULL OR estimated_unit_cost >= 0),
  ADD COLUMN IF NOT EXISTS cost_currency TEXT CHECK (cost_currency IS NULL OR cost_currency ~ '^[A-Z]{3}$');

CREATE INDEX IF NOT EXISTS crm_campaigns_goal_language_idx
  ON crm.campaigns (channel, campaign_goal, language_code, status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_campaign_members_country_status_idx
  ON crm.campaign_members (campaign_id, recipient_country_code, eligibility_status);

CREATE OR REPLACE FUNCTION public.crm_create_whatsapp_campaign_draft_v2(
  p_name TEXT,
  p_goal TEXT,
  p_purpose TEXT,
  p_template_id UUID,
  p_audience_rule JSONB,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_id UUID;
  safe_name TEXT := NULLIF(btrim(COALESCE(p_name, '')), '');
  safe_goal TEXT := lower(NULLIF(btrim(COALESCE(p_goal, '')), ''));
  safe_purpose TEXT := lower(NULLIF(btrim(COALESCE(p_purpose, '')), ''));
  safe_rule JSONB := COALESCE(p_audience_rule, '{}'::jsonb);
  safe_country TEXT;
  safe_language TEXT;
  safe_timezone TEXT;
  safe_limit INTEGER;
  template_record RECORD;
  invalid_keys TEXT[];
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(key ORDER BY key) INTO invalid_keys
  FROM jsonb_object_keys(safe_rule) AS key
  WHERE key <> ALL (ARRAY[
    'country_code', 'region', 'city', 'industry', 'source_tier',
    'language_code', 'timezone', 'min_score', 'max_recipients',
    'scheduled_local_time', 'dry_run_required', 'sending_enabled', 'wizard_version'
  ]::text[]);
  IF invalid_keys IS NOT NULL THEN
    RAISE EXCEPTION 'unsupported_audience_rule_keys: %', invalid_keys USING ERRCODE = '22023';
  END IF;

  safe_country := upper(NULLIF(btrim(COALESCE(safe_rule->>'country_code', '')), ''));
  safe_language := replace(NULLIF(btrim(COALESCE(safe_rule->>'language_code', '')), ''), '-', '_');
  safe_timezone := NULLIF(btrim(COALESCE(safe_rule->>'timezone', '')), '');
  safe_limit := LEAST(GREATEST(COALESCE(NULLIF(safe_rule->>'max_recipients', '')::integer, 100), 1), 500);

  IF safe_name IS NULL OR length(safe_name) < 3 OR length(safe_name) > 120 THEN
    RAISE EXCEPTION 'invalid_campaign_name' USING ERRCODE = '22023';
  END IF;
  IF safe_goal IS NULL OR safe_goal !~ '^[a-z0-9][a-z0-9_-]{2,63}$' THEN
    RAISE EXCEPTION 'invalid_campaign_goal' USING ERRCODE = '22023';
  END IF;
  IF safe_purpose NOT IN ('marketing', 'transactional') THEN
    RAISE EXCEPTION 'campaign_purpose_must_be_marketing_or_transactional' USING ERRCODE = '22023';
  END IF;
  IF safe_country IS NULL OR safe_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'campaign_country_required' USING ERRCODE = '22023';
  END IF;
  IF safe_language IS NULL OR safe_language !~ '^[a-z]{2}(_[A-Z]{2})?$' THEN
    RAISE EXCEPTION 'campaign_language_required' USING ERRCODE = '22023';
  END IF;
  IF safe_timezone IS NULL OR length(safe_timezone) > 80 THEN
    RAISE EXCEPTION 'campaign_timezone_required' USING ERRCODE = '22023';
  END IF;
  IF COALESCE((safe_rule->>'sending_enabled')::boolean, false) THEN
    RAISE EXCEPTION 'campaign_wizard_must_remain_no_send' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(NULLIF(safe_rule->>'min_score', '')::numeric, 0) NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'invalid_min_score' USING ERRCODE = '22023';
  END IF;

  SELECT wt.* INTO template_record
  FROM crm.whatsapp_templates wt
  WHERE wt.id = p_template_id;
  IF template_record.id IS NULL
    OR template_record.approval_status <> 'approved'
    OR NOT COALESCE(template_record.enabled_for_campaigns, false)
    OR template_record.reconciliation_status <> 'ready_for_campaign' THEN
    RAISE EXCEPTION 'campaign_enabled_approved_template_required' USING ERRCODE = '22023';
  END IF;
  IF safe_purpose = 'marketing' AND template_record.category <> 'marketing' THEN
    RAISE EXCEPTION 'marketing_template_required' USING ERRCODE = '22023';
  END IF;
  IF safe_purpose = 'transactional' AND template_record.category <> 'utility' THEN
    RAISE EXCEPTION 'utility_template_required' USING ERRCODE = '22023';
  END IF;
  IF lower(replace(template_record.language_code, '-', '_')) <> lower(safe_language) THEN
    RAISE EXCEPTION 'template_language_mismatch' USING ERRCODE = '22023';
  END IF;

  safe_rule := jsonb_build_object(
    'country_code', safe_country,
    'region', NULLIF(btrim(COALESCE(safe_rule->>'region', '')), ''),
    'city', NULLIF(btrim(COALESCE(safe_rule->>'city', '')), ''),
    'industry', NULLIF(btrim(COALESCE(safe_rule->>'industry', '')), ''),
    'source_tier', NULLIF(upper(btrim(COALESCE(safe_rule->>'source_tier', ''))), ''),
    'language_code', safe_language,
    'timezone', safe_timezone,
    'min_score', COALESCE(NULLIF(safe_rule->>'min_score', '')::numeric, 0),
    'max_recipients', safe_limit,
    'scheduled_local_time', NULLIF(btrim(COALESCE(safe_rule->>'scheduled_local_time', '')), ''),
    'dry_run_required', true,
    'sending_enabled', false,
    'wizard_version', '2.0'
  );

  INSERT INTO crm.campaigns (
    name, channel, purpose, status, audience_rule, template_id,
    campaign_goal, language_code, timezone_name, created_by_user_id
  ) VALUES (
    safe_name, 'whatsapp', safe_purpose, 'draft', safe_rule, p_template_id,
    safe_goal, safe_language, safe_timezone, p_actor_user_id
  ) RETURNING id INTO campaign_id;

  INSERT INTO crm.campaign_events (campaign_id, event_type, actor_user_id, metadata)
  VALUES (campaign_id, 'wizard_v2_draft_created', p_actor_user_id, jsonb_build_object(
    'goal', safe_goal,
    'audience_rule', safe_rule,
    'template_id', p_template_id,
    'template_name', template_record.template_name,
    'sending_enabled', false
  ));
  RETURN campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(
  p_campaign_id UUID,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  campaign_id UUID,
  total_candidates BIGINT,
  materialized_members BIGINT,
  eligible_members BIGINT,
  needs_review_members BIGINT,
  missing_consent_members BIGINT,
  suppressed_members BIGINT,
  invalid_candidates BIGINT,
  market_blocked_members BIGINT,
  language_mismatch_members BIGINT,
  missing_rate_members BIGINT,
  estimated_cost NUMERIC,
  currency TEXT,
  prepared_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
  template_record RECORD;
  rule JSONB;
  filter_country TEXT;
  filter_region TEXT;
  filter_city TEXT;
  filter_industry TEXT;
  filter_source_tier TEXT;
  filter_language TEXT;
  minimum_score NUMERIC;
  safe_limit INTEGER;
  market_ready BOOLEAN := false;
  rate_record RECORD;
  prepared_timestamp TIMESTAMPTZ := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO campaign_record FROM crm.campaigns c
  WHERE c.id = p_campaign_id AND c.channel = 'whatsapp' AND c.status IN ('draft', 'review_ready');
  IF campaign_record.id IS NULL THEN
    RAISE EXCEPTION 'campaign_not_found_or_not_editable' USING ERRCODE = '22023';
  END IF;
  IF campaign_record.purpose NOT IN ('marketing', 'transactional') THEN
    RAISE EXCEPTION 'campaign_purpose_not_supported_by_wizard_v2' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO template_record FROM crm.whatsapp_templates wt WHERE wt.id = campaign_record.template_id;
  IF template_record.id IS NULL OR template_record.approval_status <> 'approved'
    OR NOT template_record.enabled_for_campaigns OR template_record.reconciliation_status <> 'ready_for_campaign' THEN
    RAISE EXCEPTION 'campaign_template_not_ready' USING ERRCODE = '22023';
  END IF;

  rule := campaign_record.audience_rule;
  filter_country := upper(NULLIF(rule->>'country_code', ''));
  filter_region := NULLIF(rule->>'region', '');
  filter_city := NULLIF(rule->>'city', '');
  filter_industry := NULLIF(rule->>'industry', '');
  filter_source_tier := upper(NULLIF(rule->>'source_tier', ''));
  filter_language := lower(replace(NULLIF(rule->>'language_code', ''), '-', '_'));
  minimum_score := COALESCE(NULLIF(rule->>'min_score', '')::numeric, 0);
  safe_limit := LEAST(GREATEST(COALESCE(NULLIF(rule->>'max_recipients', '')::integer, 100), 1), 500);

  SELECT (
    mp.market_status IN ('pilot', 'approved')
    AND mp.whatsapp_marketing_enabled
    AND mp.reviewed_at IS NOT NULL
  ) INTO market_ready
  FROM crm.market_policies mp WHERE mp.country_code = filter_country;
  market_ready := COALESCE(market_ready, false);

  SELECT rc.* INTO rate_record FROM crm.whatsapp_rate_cards rc
  WHERE rc.country_code = filter_country
    AND rc.category = template_record.category
    AND rc.status = 'active'
    AND rc.effective_from <= prepared_timestamp
    AND (rc.effective_to IS NULL OR rc.effective_to > prepared_timestamp)
  ORDER BY rc.effective_from DESC LIMIT 1;

  UPDATE crm.campaign_members cm SET
    eligibility_status = 'excluded',
    eligibility_reasons = '["recomputed_by_wizard_v2"]'::jsonb,
    queued_job_id = NULL,
    provider_message_id = NULL,
    estimated_unit_cost = NULL,
    cost_currency = NULL,
    updated_at = prepared_timestamp
  WHERE cm.campaign_id = p_campaign_id
    AND cm.queued_job_id IS NULL AND cm.provider_message_id IS NULL;

  CREATE TEMP TABLE pg_temp.whatsapp_campaign_v2_candidates ON COMMIT DROP AS
  WITH candidates AS (
    SELECT
      c.id AS contact_id,
      a.id AS account_id,
      cp.id AS contact_point_id,
      cp.normalized_value,
      cp.validation_status,
      COALESCE(c.country_code, a.country_code, cp.country_code) AS country_code,
      c.language_code AS contact_language,
      a.region,
      a.city,
      a.industry,
      a.source_tier,
      COALESCE(score.score, 0) AS score,
      perm.id AS permission_id,
      perm.status AS permission_status,
      perm.consented_at,
      perm.consent_source,
      perm.consent_text_version,
      EXISTS (
        SELECT 1 FROM crm.consent_evidence ce
        WHERE ce.channel_permission_id = perm.id
          AND ce.contact_id = c.id
          AND ce.channel = 'whatsapp'
          AND ce.purpose = campaign_record.purpose
      ) AS has_evidence,
      suppression.id IS NOT NULL AS suppressed
    FROM crm.contacts c
    LEFT JOIN LATERAL (
      SELECT a1.* FROM crm.account_contacts ac1
      JOIN crm.accounts a1 ON a1.id = ac1.account_id
      WHERE ac1.contact_id = c.id
      ORDER BY ac1.is_primary DESC, ac1.created_at DESC LIMIT 1
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT cp1.* FROM crm.contact_points cp1
      WHERE cp1.contact_id = c.id AND cp1.point_type = 'whatsapp'
      ORDER BY cp1.is_primary DESC, cp1.updated_at DESC LIMIT 1
    ) cp ON true
    LEFT JOIN LATERAL (
      SELECT ss.score FROM crm.score_snapshots ss
      WHERE ss.contact_id = c.id ORDER BY ss.computed_at DESC LIMIT 1
    ) score ON true
    LEFT JOIN crm.channel_permissions perm
      ON perm.contact_id = c.id AND perm.channel = 'whatsapp' AND perm.purpose = campaign_record.purpose
    LEFT JOIN LATERAL (
      SELECT s.id FROM crm.suppressions s
      WHERE s.status = 'active' AND s.identifier_type = 'whatsapp'
        AND s.normalized_identifier = cp.normalized_value
        AND (s.channel = 'whatsapp' OR s.channel IS NULL)
      LIMIT 1
    ) suppression ON true
    WHERE c.contact_status = 'active'
      AND COALESCE(c.country_code, a.country_code, cp.country_code) = filter_country
      AND (filter_region IS NULL OR a.region ILIKE filter_region)
      AND (filter_city IS NULL OR a.city ILIKE filter_city)
      AND (filter_industry IS NULL OR a.industry ILIKE '%' || filter_industry || '%')
      AND (filter_source_tier IS NULL OR a.source_tier = filter_source_tier)
      AND COALESCE(score.score, 0) >= minimum_score
  )
  SELECT
    candidate.*,
    CASE
      WHEN candidate.contact_point_id IS NULL OR candidate.validation_status <> 'valid' THEN 'invalid_contact'
      WHEN candidate.suppressed OR candidate.permission_status IN ('opted_out', 'suppressed', 'invalid', 'complaint') THEN 'suppressed'
      WHEN candidate.permission_id IS NULL
        OR candidate.permission_status NOT IN ('allowed', 'opted_in')
        OR candidate.consented_at IS NULL
        OR NULLIF(btrim(candidate.consent_source), '') IS NULL
        OR NULLIF(btrim(candidate.consent_text_version), '') IS NULL
        OR NOT candidate.has_evidence THEN 'missing_consent'
      WHEN campaign_record.purpose = 'marketing' AND NOT market_ready THEN 'needs_review'
      WHEN rate_record.id IS NULL THEN 'needs_review'
      WHEN candidate.contact_language IS NOT NULL
        AND lower(replace(candidate.contact_language, '-', '_')) <> filter_language THEN 'needs_review'
      ELSE 'eligible'
    END AS eligibility_status,
    COALESCE((
      SELECT jsonb_agg(reason) FROM (VALUES
        (CASE WHEN candidate.contact_point_id IS NULL THEN 'missing_whatsapp_contact_point' END),
        (CASE WHEN candidate.contact_point_id IS NOT NULL AND candidate.validation_status <> 'valid' THEN 'invalid_whatsapp_contact_point' END),
        (CASE WHEN candidate.suppressed THEN 'suppression_active' END),
        (CASE WHEN candidate.permission_status IN ('opted_out', 'suppressed', 'invalid', 'complaint') THEN 'blocked_permission_status' END),
        (CASE WHEN candidate.permission_id IS NULL OR candidate.permission_status NOT IN ('allowed', 'opted_in') THEN campaign_record.purpose || '_consent_missing' END),
        (CASE WHEN candidate.permission_id IS NOT NULL AND NOT candidate.has_evidence THEN 'consent_evidence_missing' END),
        (CASE WHEN campaign_record.purpose = 'marketing' AND NOT market_ready THEN 'market_not_enabled' END),
        (CASE WHEN rate_record.id IS NULL THEN 'active_rate_card_missing' END),
        (CASE WHEN candidate.contact_language IS NOT NULL AND lower(replace(candidate.contact_language, '-', '_')) <> filter_language THEN 'language_mismatch' END)
      ) reasons(reason) WHERE reason IS NOT NULL
    ), '[]'::jsonb) AS eligibility_reasons
  FROM candidates candidate
  ORDER BY
    CASE
      WHEN candidate.contact_point_id IS NOT NULL AND candidate.validation_status = 'valid'
        AND NOT candidate.suppressed AND candidate.permission_status IN ('allowed', 'opted_in')
        AND candidate.has_evidence AND (campaign_record.purpose <> 'marketing' OR market_ready)
        AND rate_record.id IS NOT NULL THEN 0
      ELSE 1
    END,
    candidate.score DESC,
    candidate.contact_id
  LIMIT safe_limit;

  INSERT INTO crm.campaign_members (
    campaign_id, account_id, contact_id, contact_point_id, eligibility_status,
    eligibility_reasons, score, recipient_country_code, language_code,
    estimated_unit_cost, cost_currency, queued_job_id, provider_message_id, updated_at
  )
  SELECT
    p_campaign_id, candidate.account_id, candidate.contact_id, candidate.contact_point_id,
    candidate.eligibility_status, candidate.eligibility_reasons, candidate.score,
    candidate.country_code, campaign_record.language_code,
    CASE WHEN candidate.eligibility_status = 'eligible' THEN rate_record.unit_cost ELSE NULL END,
    CASE WHEN candidate.eligibility_status = 'eligible' THEN rate_record.currency ELSE NULL END,
    NULL, NULL, prepared_timestamp
  FROM pg_temp.whatsapp_campaign_v2_candidates candidate
  WHERE candidate.contact_point_id IS NOT NULL
  ON CONFLICT (campaign_id, contact_id, contact_point_id) DO UPDATE SET
    account_id = EXCLUDED.account_id,
    eligibility_status = EXCLUDED.eligibility_status,
    eligibility_reasons = EXCLUDED.eligibility_reasons,
    score = EXCLUDED.score,
    recipient_country_code = EXCLUDED.recipient_country_code,
    language_code = EXCLUDED.language_code,
    estimated_unit_cost = EXCLUDED.estimated_unit_cost,
    cost_currency = EXCLUDED.cost_currency,
    queued_job_id = NULL,
    provider_message_id = NULL,
    updated_at = EXCLUDED.updated_at;

  UPDATE crm.campaigns c SET
    status = 'review_ready',
    estimated_recipient_count = stats.eligible_count,
    estimated_cost = stats.estimated_total,
    cost_currency = rate_record.currency,
    audience_rule = c.audience_rule || jsonb_build_object(
      'last_dry_run_at', prepared_timestamp,
      'last_dry_run_limit', safe_limit,
      'sending_enabled', false,
      'wizard_version', '2.0'
    ),
    updated_at = prepared_timestamp
  FROM (
    SELECT
      count(*) FILTER (WHERE eligibility_status = 'eligible')::integer AS eligible_count,
      (count(*) FILTER (WHERE eligibility_status = 'eligible') * COALESCE(rate_record.unit_cost, 0))::numeric AS estimated_total
    FROM pg_temp.whatsapp_campaign_v2_candidates
  ) stats
  WHERE c.id = p_campaign_id;

  INSERT INTO crm.campaign_events (campaign_id, event_type, actor_user_id, metadata)
  SELECT p_campaign_id, 'wizard_v2_audience_prepared', p_actor_user_id, jsonb_build_object(
    'total_candidates', count(*),
    'eligible_members', count(*) FILTER (WHERE eligibility_status = 'eligible'),
    'needs_review_members', count(*) FILTER (WHERE eligibility_status = 'needs_review'),
    'missing_consent_members', count(*) FILTER (WHERE eligibility_status = 'missing_consent'),
    'suppressed_members', count(*) FILTER (WHERE eligibility_status = 'suppressed'),
    'invalid_candidates', count(*) FILTER (WHERE eligibility_status = 'invalid_contact'),
    'estimated_cost', count(*) FILTER (WHERE eligibility_status = 'eligible') * COALESCE(rate_record.unit_cost, 0),
    'currency', rate_record.currency,
    'sending_enabled', false
  ) FROM pg_temp.whatsapp_campaign_v2_candidates;

  RETURN QUERY SELECT
    p_campaign_id,
    count(*)::bigint,
    count(*) FILTER (WHERE contact_point_id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE eligibility_status = 'eligible')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'needs_review')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'missing_consent')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'suppressed')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'invalid_contact')::bigint,
    count(*) FILTER (WHERE eligibility_reasons @> '["market_not_enabled"]'::jsonb)::bigint,
    count(*) FILTER (WHERE eligibility_reasons @> '["language_mismatch"]'::jsonb)::bigint,
    count(*) FILTER (WHERE eligibility_reasons @> '["active_rate_card_missing"]'::jsonb)::bigint,
    (count(*) FILTER (WHERE eligibility_status = 'eligible') * COALESCE(rate_record.unit_cost, 0))::numeric,
    rate_record.currency,
    prepared_timestamp
  FROM pg_temp.whatsapp_campaign_v2_candidates;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_report_v2(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  result JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm.campaigns c WHERE c.id = p_campaign_id AND c.channel = 'whatsapp') THEN
    RAISE EXCEPTION 'whatsapp_campaign_not_found' USING ERRCODE = '22023';
  END IF;

  WITH member_stats AS (
    SELECT
      count(*) AS selected,
      count(*) FILTER (WHERE eligibility_status = 'eligible') AS eligible,
      count(*) FILTER (WHERE eligibility_status = 'missing_consent') AS missing_consent,
      count(*) FILTER (WHERE eligibility_status = 'suppressed') AS suppressed,
      count(*) FILTER (WHERE eligibility_status IN ('invalid_contact', 'needs_review', 'excluded')) AS excluded
    FROM crm.campaign_members WHERE campaign_id = p_campaign_id
  ), message_stats AS (
    SELECT
      count(*) FILTER (WHERE direction = 'outbound') AS queued_or_sent,
      count(*) FILTER (WHERE direction = 'outbound' AND current_status IN ('accepted', 'sent', 'delivered', 'read')) AS accepted,
      count(*) FILTER (WHERE direction = 'outbound' AND current_status IN ('sent', 'delivered', 'read')) AS sent,
      count(*) FILTER (WHERE direction = 'outbound' AND current_status IN ('delivered', 'read')) AS delivered,
      count(*) FILTER (WHERE direction = 'outbound' AND current_status = 'read') AS read,
      count(*) FILTER (WHERE direction = 'outbound' AND current_status = 'failed') AS failed
    FROM crm.messages WHERE crm_campaign_id = p_campaign_id
  ), cost_stats AS (
    SELECT
      COALESCE(sum(COALESCE(ul.confirmed_unit_cost, ul.estimated_unit_cost, 0) * ul.quantity), 0) AS actual_cost,
      max(ul.currency) AS currency
    FROM crm.usage_ledger ul
    JOIN crm.messages m ON m.id = ul.message_id
    WHERE m.crm_campaign_id = p_campaign_id
  )
  SELECT jsonb_build_object(
    'campaign_id', c.id,
    'name', c.name,
    'goal', c.campaign_goal,
    'purpose', c.purpose,
    'status', c.status,
    'language_code', c.language_code,
    'timezone', c.timezone_name,
    'audience_rule', c.audience_rule,
    'estimated_recipients', c.estimated_recipient_count,
    'estimated_cost', c.estimated_cost,
    'estimated_currency', c.cost_currency,
    'selected', ms.selected,
    'eligible', ms.eligible,
    'missing_consent', ms.missing_consent,
    'suppressed', ms.suppressed,
    'excluded', ms.excluded,
    'queued_or_sent', msgs.queued_or_sent,
    'accepted', msgs.accepted,
    'sent', msgs.sent,
    'delivered', msgs.delivered,
    'read', msgs.read,
    'failed', msgs.failed,
    'actual_cost', costs.actual_cost,
    'actual_currency', COALESCE(costs.currency, c.cost_currency),
    'delivery_rate', CASE WHEN msgs.sent > 0 THEN round((msgs.delivered::numeric / msgs.sent::numeric) * 100, 2) ELSE 0 END,
    'read_rate', CASE WHEN msgs.delivered > 0 THEN round((msgs.read::numeric / msgs.delivered::numeric) * 100, 2) ELSE 0 END,
    'generated_at', now(),
    'sending_enabled', false
  ) INTO result
  FROM crm.campaigns c
  CROSS JOIN member_stats ms
  CROSS JOIN message_stats msgs
  CROSS JOIN cost_stats costs
  WHERE c.id = p_campaign_id;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_whatsapp_campaign_draft_v2(TEXT, TEXT, TEXT, UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_create_whatsapp_campaign_draft_v2(TEXT, TEXT, TEXT, UUID, JSONB, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_report_v2(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_report_v2(UUID) TO service_role;

COMMENT ON FUNCTION public.crm_create_whatsapp_campaign_draft_v2(TEXT, TEXT, TEXT, UUID, JSONB, UUID) IS
  'Admin-only campaign wizard draft. Requires enabled template, exact language and a bounded allowlisted audience rule. Never sends.';
COMMENT ON FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID) IS
  'Admin-only evidenced-consent, market, language and active-rate dry run. Never queues or sends.';
COMMENT ON FUNCTION public.crm_whatsapp_campaign_report_v2(UUID) IS
  'Admin-only campaign outcome aggregation from CRM messages and usage ledger.';
