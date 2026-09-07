-- Read-only WhatsApp campaign audience preview.
--
-- This function lets admins inspect a bounded audience sample before creating
-- a campaign. It does not insert campaign members, enqueue jobs or contact
-- anyone.

CREATE OR REPLACE FUNCTION public.crm_whatsapp_campaign_preview(
  p_country_code TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  contact_id UUID,
  account_id UUID,
  contact_label TEXT,
  account_label TEXT,
  country_code TEXT,
  industry TEXT,
  whatsapp_point_valid BOOLEAN,
  eligibility_status TEXT,
  eligibility_reasons JSONB,
  computed_score NUMERIC,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  safe_limit INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  RETURN QUERY
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
      bool_or(cp.channel = 'whatsapp' AND cp.purpose = 'marketing' AND cp.status IN ('allowed', 'opted_in')) AS marketing_allowed,
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
      COALESCE(NULLIF(c.full_name, ''), 'Contacto sin nombre') AS contact_label,
      a.display_name AS account_label,
      COALESCE(c.country_code, a.country_code) AS country_code,
      a.industry,
      cp.id AS contact_point_id,
      cp.normalized_value,
      cp.validation_status,
      COALESCE(pr.marketing_allowed, false) AS marketing_allowed,
      COALESCE(pr.blocked, false) AS permission_blocked,
      s.normalized_identifier IS NOT NULL AS suppressed,
      COALESCE(ls.score, 0) AS score
    FROM crm.contacts c
    LEFT JOIN primary_accounts pa ON pa.contact_id = c.id
    LEFT JOIN crm.accounts a ON a.id = pa.account_id
    LEFT JOIN crm.contact_points cp ON cp.contact_id = c.id AND cp.point_type = 'whatsapp'
    LEFT JOIN permission_rollup pr ON pr.contact_id = c.id
    LEFT JOIN active_suppressions s ON s.normalized_identifier = cp.normalized_value
    LEFT JOIN latest_scores ls ON ls.contact_id = c.id
    WHERE c.contact_status = 'active'
      AND (p_country_code IS NULL OR COALESCE(c.country_code, a.country_code) = upper(p_country_code))
      AND (p_industry IS NULL OR a.industry ILIKE '%' || p_industry || '%')
  )
  SELECT
    candidate.contact_id,
    candidate.account_id,
    candidate.contact_label,
    candidate.account_label,
    candidate.country_code,
    candidate.industry,
    candidate.contact_point_id IS NOT NULL AND candidate.validation_status = 'valid',
    CASE
      WHEN candidate.contact_point_id IS NULL OR candidate.validation_status <> 'valid' THEN 'invalid_contact'
      WHEN candidate.suppressed OR candidate.permission_blocked THEN 'suppressed'
      WHEN NOT candidate.marketing_allowed THEN 'missing_consent'
      ELSE 'eligible'
    END,
    COALESCE((
      SELECT jsonb_agg(reason)
      FROM (
        VALUES
          (CASE WHEN candidate.contact_point_id IS NULL THEN 'missing_whatsapp_contact_point' END),
          (CASE WHEN candidate.contact_point_id IS NOT NULL AND candidate.validation_status <> 'valid' THEN 'invalid_whatsapp_contact_point' END),
          (CASE WHEN candidate.suppressed THEN 'suppression_active' END),
          (CASE WHEN candidate.permission_blocked THEN 'blocked_permission_status' END),
          (CASE WHEN NOT candidate.marketing_allowed THEN 'marketing_consent_missing' END)
      ) AS reasons(reason)
      WHERE reason IS NOT NULL
    ), '[]'::jsonb),
    candidate.score,
    now()
  FROM candidates candidate
  ORDER BY
    CASE
      WHEN candidate.contact_point_id IS NOT NULL
        AND candidate.validation_status = 'valid'
        AND NOT candidate.suppressed
        AND NOT candidate.permission_blocked
        AND candidate.marketing_allowed THEN 0
      WHEN candidate.contact_point_id IS NOT NULL
        AND candidate.validation_status = 'valid' THEN 1
      ELSE 2
    END,
    candidate.score DESC,
    candidate.contact_label
  LIMIT safe_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_campaign_preview(TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_campaign_preview(TEXT, TEXT, INTEGER)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_whatsapp_campaign_preview(TEXT, TEXT, INTEGER) IS
  'Admin-only WhatsApp campaign audience preview. It performs no writes and sends nothing.';
