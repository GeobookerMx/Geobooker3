-- WhatsApp campaign draft + dry-run preparation.
--
-- This migration lets an administrator create a campaign draft and materialize
-- a bounded review audience. It does not approve campaigns, enqueue outbound
-- jobs, call Meta Graph API, or send messages.

CREATE INDEX IF NOT EXISTS crm_campaign_members_unique_contact_point_uidx
  ON crm.campaign_members (
    campaign_id,
    contact_id,
    COALESCE(contact_point_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE OR REPLACE FUNCTION public.crm_create_whatsapp_campaign_draft(
  p_name TEXT,
  p_purpose TEXT DEFAULT 'marketing',
  p_template_id UUID DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_id UUID;
  safe_name TEXT;
  safe_purpose TEXT;
  safe_country_code TEXT;
  safe_industry TEXT;
  safe_limit INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  safe_name := NULLIF(btrim(COALESCE(p_name, '')), '');
  safe_purpose := lower(NULLIF(btrim(COALESCE(p_purpose, 'marketing')), ''));
  safe_country_code := upper(NULLIF(btrim(COALESCE(p_country_code, '')), ''));
  safe_industry := NULLIF(btrim(COALESCE(p_industry, '')), '');
  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);

  IF safe_name IS NULL OR length(safe_name) < 3 OR length(safe_name) > 120 THEN
    RAISE EXCEPTION 'invalid_campaign_name' USING ERRCODE = '22023';
  END IF;

  IF safe_purpose NOT IN ('marketing', 'transactional', 'service') THEN
    RAISE EXCEPTION 'invalid_campaign_purpose' USING ERRCODE = '22023';
  END IF;

  IF safe_country_code IS NOT NULL AND safe_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code' USING ERRCODE = '22023';
  END IF;

  IF safe_purpose <> 'service' AND p_template_id IS NULL THEN
    RAISE EXCEPTION 'template_required_for_campaign' USING ERRCODE = '22023';
  END IF;

  IF p_template_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM crm.whatsapp_templates wt
    WHERE wt.id = p_template_id
      AND wt.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'approved_template_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO crm.campaigns (
    name,
    channel,
    purpose,
    status,
    audience_rule,
    template_id,
    created_by_user_id
  )
  VALUES (
    safe_name,
    'whatsapp',
    safe_purpose,
    'draft',
    jsonb_build_object(
      'country_code', safe_country_code,
      'industry', safe_industry,
      'limit', safe_limit,
      'dry_run_required', true,
      'sending_enabled', false
    ),
    p_template_id,
    p_actor_user_id
  )
  RETURNING id INTO campaign_id;

  INSERT INTO crm.campaign_events (
    campaign_id,
    event_type,
    actor_user_id,
    metadata
  )
  VALUES (
    campaign_id,
    'draft_created',
    p_actor_user_id,
    jsonb_build_object(
      'country_code', safe_country_code,
      'industry', safe_industry,
      'limit', safe_limit,
      'sending_enabled', false
    )
  );

  RETURN campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_prepare_whatsapp_campaign_review(
  p_campaign_id UUID,
  p_limit INTEGER DEFAULT NULL,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  campaign_id UUID,
  total_candidates BIGINT,
  materialized_members BIGINT,
  eligible_members BIGINT,
  missing_consent_members BIGINT,
  suppressed_members BIGINT,
  invalid_candidates BIGINT,
  prepared_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  campaign_record RECORD;
  safe_limit INTEGER;
  filter_country_code TEXT;
  filter_industry TEXT;
  prepared_timestamp TIMESTAMPTZ := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO campaign_record
  FROM crm.campaigns c
  WHERE c.id = p_campaign_id
    AND c.channel = 'whatsapp'
    AND c.status IN ('draft', 'review_ready');

  IF campaign_record.id IS NULL THEN
    RAISE EXCEPTION 'campaign_not_found_or_not_editable' USING ERRCODE = '22023';
  END IF;

  safe_limit := LEAST(
    GREATEST(
      COALESCE(
        p_limit,
        NULLIF(campaign_record.audience_rule->>'limit', '')::integer,
        100
      ),
      1
    ),
    500
  );
  filter_country_code := upper(NULLIF(btrim(COALESCE(campaign_record.audience_rule->>'country_code', '')), ''));
  filter_industry := NULLIF(btrim(COALESCE(campaign_record.audience_rule->>'industry', '')), '');

  UPDATE crm.campaign_members cm
  SET
    eligibility_status = 'excluded',
    eligibility_reasons = '["recomputed_by_dry_run"]'::jsonb,
    queued_job_id = NULL,
    provider_message_id = NULL,
    updated_at = prepared_timestamp
  WHERE cm.campaign_id = p_campaign_id
    AND cm.queued_job_id IS NULL
    AND cm.provider_message_id IS NULL;

  CREATE TEMP TABLE pg_temp.whatsapp_campaign_candidates ON COMMIT DROP AS
  WITH primary_accounts AS (
    SELECT DISTINCT ON (ac.contact_id)
      ac.contact_id,
      ac.account_id
    FROM crm.account_contacts ac
    ORDER BY ac.contact_id, ac.is_primary DESC, ac.created_at DESC
  ),
  latest_scores AS (
    SELECT DISTINCT ON (ss.contact_id)
      ss.contact_id,
      ss.score
    FROM crm.score_snapshots ss
    WHERE ss.contact_id IS NOT NULL
    ORDER BY ss.contact_id, ss.computed_at DESC
  ),
  permission_rollup AS (
    SELECT
      cp.contact_id,
      bool_or(cp.channel = 'whatsapp' AND cp.purpose = campaign_record.purpose AND cp.status IN ('allowed', 'opted_in')) AS purpose_allowed,
      bool_or(cp.channel = 'whatsapp' AND cp.status IN ('opted_out', 'suppressed', 'invalid', 'complaint')) AS blocked
    FROM crm.channel_permissions cp
    GROUP BY cp.contact_id
  ),
  active_suppressions AS (
    SELECT DISTINCT normalized_identifier
    FROM crm.suppressions
    WHERE status = 'active'
      AND identifier_type = 'whatsapp'
      AND (channel = 'whatsapp' OR channel IS NULL)
  ),
  candidates AS (
    SELECT
      c.id AS contact_id,
      a.id AS account_id,
      cp.id AS contact_point_id,
      cp.normalized_value,
      cp.validation_status,
      COALESCE(pr.purpose_allowed, false) AS purpose_allowed,
      COALESCE(pr.blocked, false) AS permission_blocked,
      s.normalized_identifier IS NOT NULL AS suppressed,
      COALESCE(ls.score, 0) AS score,
      COALESCE(NULLIF(c.full_name, ''), 'Contacto sin nombre') AS contact_label
    FROM crm.contacts c
    LEFT JOIN primary_accounts pa ON pa.contact_id = c.id
    LEFT JOIN crm.accounts a ON a.id = pa.account_id
    LEFT JOIN crm.contact_points cp ON cp.contact_id = c.id AND cp.point_type = 'whatsapp'
    LEFT JOIN permission_rollup pr ON pr.contact_id = c.id
    LEFT JOIN active_suppressions s ON s.normalized_identifier = cp.normalized_value
    LEFT JOIN latest_scores ls ON ls.contact_id = c.id
    WHERE c.contact_status = 'active'
      AND (filter_country_code IS NULL OR COALESCE(c.country_code, a.country_code) = filter_country_code)
      AND (filter_industry IS NULL OR a.industry ILIKE '%' || filter_industry || '%')
  )
  SELECT
    candidate.contact_id,
    candidate.account_id,
    candidate.contact_point_id,
    CASE
      WHEN candidate.contact_point_id IS NULL OR candidate.validation_status <> 'valid' THEN 'invalid_contact'
      WHEN candidate.suppressed OR candidate.permission_blocked THEN 'suppressed'
      WHEN NOT candidate.purpose_allowed THEN 'missing_consent'
      ELSE 'eligible'
    END AS eligibility_status,
    COALESCE((
      SELECT jsonb_agg(reason)
      FROM (
        VALUES
          (CASE WHEN candidate.contact_point_id IS NULL THEN 'missing_whatsapp_contact_point' END),
          (CASE WHEN candidate.contact_point_id IS NOT NULL AND candidate.validation_status <> 'valid' THEN 'invalid_whatsapp_contact_point' END),
          (CASE WHEN candidate.suppressed THEN 'suppression_active' END),
          (CASE WHEN candidate.permission_blocked THEN 'blocked_permission_status' END),
          (CASE WHEN NOT candidate.purpose_allowed THEN campaign_record.purpose || '_consent_missing' END)
      ) AS reasons(reason)
      WHERE reason IS NOT NULL
    ), '[]'::jsonb) AS eligibility_reasons,
    candidate.score
  FROM candidates candidate
  ORDER BY
    CASE
      WHEN candidate.contact_point_id IS NOT NULL
        AND candidate.validation_status = 'valid'
        AND NOT candidate.suppressed
        AND NOT candidate.permission_blocked
        AND candidate.purpose_allowed THEN 0
      WHEN candidate.contact_point_id IS NOT NULL
        AND candidate.validation_status = 'valid' THEN 1
      ELSE 2
    END,
    candidate.score DESC,
    candidate.contact_label
  LIMIT safe_limit;

  INSERT INTO crm.campaign_members (
    campaign_id,
    account_id,
    contact_id,
    contact_point_id,
    eligibility_status,
    eligibility_reasons,
    score,
    queued_job_id,
    provider_message_id,
    updated_at
  )
  SELECT
    p_campaign_id,
    candidate.account_id,
    candidate.contact_id,
    candidate.contact_point_id,
    candidate.eligibility_status,
    candidate.eligibility_reasons,
    candidate.score,
    NULL,
    NULL,
    prepared_timestamp
  FROM pg_temp.whatsapp_campaign_candidates candidate
  WHERE candidate.contact_point_id IS NOT NULL
  ON CONFLICT (campaign_id, contact_id, contact_point_id)
  DO UPDATE SET
    account_id = EXCLUDED.account_id,
    eligibility_status = EXCLUDED.eligibility_status,
    eligibility_reasons = EXCLUDED.eligibility_reasons,
    score = EXCLUDED.score,
    queued_job_id = NULL,
    provider_message_id = NULL,
    updated_at = EXCLUDED.updated_at;

  UPDATE crm.campaigns c
  SET
    status = 'review_ready',
    audience_rule = c.audience_rule || jsonb_build_object(
      'last_dry_run_at', prepared_timestamp,
      'last_dry_run_limit', safe_limit,
      'sending_enabled', false
    ),
    updated_at = prepared_timestamp
  WHERE c.id = p_campaign_id;

  INSERT INTO crm.campaign_events (
    campaign_id,
    event_type,
    actor_user_id,
    metadata
  )
  SELECT
    p_campaign_id,
    'audience_dry_run_prepared',
    p_actor_user_id,
    jsonb_build_object(
      'limit', safe_limit,
      'total_candidates', count(*),
      'materialized_members', count(*) FILTER (WHERE contact_point_id IS NOT NULL),
      'eligible_members', count(*) FILTER (WHERE eligibility_status = 'eligible'),
      'missing_consent_members', count(*) FILTER (WHERE eligibility_status = 'missing_consent'),
      'suppressed_members', count(*) FILTER (WHERE eligibility_status = 'suppressed'),
      'invalid_candidates', count(*) FILTER (WHERE eligibility_status = 'invalid_contact'),
      'sending_enabled', false
    )
  FROM pg_temp.whatsapp_campaign_candidates;

  RETURN QUERY
  SELECT
    p_campaign_id,
    count(*)::bigint,
    count(*) FILTER (WHERE contact_point_id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE eligibility_status = 'eligible')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'missing_consent')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'suppressed')::bigint,
    count(*) FILTER (WHERE eligibility_status = 'invalid_contact')::bigint,
    prepared_timestamp
  FROM pg_temp.whatsapp_campaign_candidates;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_whatsapp_campaign_draft(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_create_whatsapp_campaign_draft(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.crm_prepare_whatsapp_campaign_review(UUID, INTEGER, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_prepare_whatsapp_campaign_review(UUID, INTEGER, UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_create_whatsapp_campaign_draft(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, UUID) IS
  'Admin-only WhatsApp campaign draft creation. It sends nothing and keeps sending_enabled=false.';

COMMENT ON FUNCTION public.crm_prepare_whatsapp_campaign_review(UUID, INTEGER, UUID) IS
  'Admin-only WhatsApp campaign dry run. It materializes review members but creates no outbound jobs.';
