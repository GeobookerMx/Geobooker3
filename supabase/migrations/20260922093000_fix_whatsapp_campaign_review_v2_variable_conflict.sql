-- Fix WhatsApp Campaign Wizard V2 dry-run review — campaign_id column ambiguity.
--
-- Supabase Cloud does not allow SET plpgsql.variable_conflict in CREATE FUNCTION.
-- Fix: rename the RETURNS TABLE OUT column from "campaign_id" to "result_campaign_id"
-- so it no longer conflicts with the physical column crm.campaign_members.campaign_id
-- inside the function body's ON CONFLICT clause.
--
-- The Edge Function whatsapp-admin reads data?.[0] and returns the full object;
-- the frontend only reads total_candidates, eligible_members, materialized_members,
-- missing_consent_members, suppressed_members, invalid_candidates — never campaign_id.
-- So this rename is safe and fully backward compatible.
--
-- DROP required because PostgreSQL does not allow changing return type with CREATE OR REPLACE.
-- The only change is renaming OUT column campaign_id → result_campaign_id to remove ambiguity.
-- No data is lost; no dependencies exist on this function outside whatsapp-admin Edge Function.

DROP FUNCTION IF EXISTS public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID);

CREATE FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(
  p_campaign_id UUID,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  result_campaign_id UUID,
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

  -- Reset any previously computed (non-queued/non-sent) members
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

  -- Use p_campaign_id explicitly in INSERT to avoid any residual column/variable ambiguity
  INSERT INTO crm.campaign_members (
    campaign_id, account_id, contact_id, contact_point_id, eligibility_status,
    eligibility_reasons, score, recipient_country_code, language_code,
    estimated_unit_cost, cost_currency, queued_job_id, provider_message_id, updated_at
  )
  SELECT
    p_campaign_id,
    candidate.account_id,
    candidate.contact_id,
    candidate.contact_point_id,
    candidate.eligibility_status,
    candidate.eligibility_reasons,
    candidate.score,
    candidate.country_code,
    campaign_record.language_code,
    CASE WHEN candidate.eligibility_status = 'eligible' THEN rate_record.unit_cost ELSE NULL END,
    CASE WHEN candidate.eligibility_status = 'eligible' THEN rate_record.currency ELSE NULL END,
    NULL,
    NULL,
    prepared_timestamp
  FROM pg_temp.whatsapp_campaign_v2_candidates candidate
  WHERE candidate.contact_point_id IS NOT NULL
  ON CONFLICT (campaign_id, contact_id, contact_point_id) DO UPDATE SET
    account_id             = EXCLUDED.account_id,
    eligibility_status     = EXCLUDED.eligibility_status,
    eligibility_reasons    = EXCLUDED.eligibility_reasons,
    score                  = EXCLUDED.score,
    recipient_country_code = EXCLUDED.recipient_country_code,
    language_code          = EXCLUDED.language_code,
    estimated_unit_cost    = EXCLUDED.estimated_unit_cost,
    cost_currency          = EXCLUDED.cost_currency,
    queued_job_id          = NULL,
    provider_message_id    = NULL,
    updated_at             = EXCLUDED.updated_at;

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

  -- Return result_campaign_id (renamed from campaign_id to avoid PL/pgSQL OUT variable clash)
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

REVOKE ALL ON FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_prepare_whatsapp_campaign_review_v2(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
