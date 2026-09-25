-- WhatsApp campaign audience diagnostics.
--
-- Read-only funnel that explains why the Campaign Wizard has 0 recipients.
-- It sends nothing, enqueues nothing and does not create campaign rows.

CREATE OR REPLACE FUNCTION public.crm_whatsapp_audience_diagnostics(
  p_country_code TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT 'marketing',
  p_language_code TEXT DEFAULT NULL,
  p_source_tier TEXT DEFAULT NULL,
  p_min_score NUMERIC DEFAULT 0
)
RETURNS TABLE (
  metric_key TEXT,
  metric_label TEXT,
  metric_value BIGINT,
  metric_status TEXT,
  detail TEXT,
  next_action TEXT,
  generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  safe_country TEXT := upper(NULLIF(btrim(COALESCE(p_country_code, '')), ''));
  safe_industry TEXT := NULLIF(btrim(COALESCE(p_industry, '')), '');
  safe_purpose TEXT := lower(NULLIF(btrim(COALESCE(p_purpose, 'marketing')), ''));
  safe_language TEXT := lower(replace(NULLIF(btrim(COALESCE(p_language_code, '')), ''), '-', '_'));
  safe_source_tier TEXT := upper(NULLIF(btrim(COALESCE(p_source_tier, '')), ''));
  safe_min_score NUMERIC := LEAST(GREATEST(COALESCE(p_min_score, 0), 0), 100);
  open_data_count BIGINT := 0;
  now_timestamp TIMESTAMPTZ := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  IF safe_purpose NOT IN ('marketing', 'transactional', 'service') THEN
    RAISE EXCEPTION 'invalid_purpose' USING ERRCODE = '22023';
  END IF;

  IF safe_country IS NOT NULL AND safe_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code' USING ERRCODE = '22023';
  END IF;

  IF safe_source_tier IS NOT NULL AND safe_source_tier NOT IN ('AAA', 'AA', 'A', 'B') THEN
    RAISE EXCEPTION 'invalid_source_tier' USING ERRCODE = '22023';
  END IF;

  IF to_regclass('public.international_businesses') IS NOT NULL THEN
    EXECUTE '
      SELECT count(*)::bigint
      FROM public.international_businesses ib
      WHERE ($1::text IS NULL OR ib.country_code = $1)
        AND ($2::text IS NULL OR ib.category ILIKE ''%'' || $2 || ''%''
          OR ib.subcategory ILIKE ''%'' || $2 || ''%''
          OR ib.description ILIKE ''%'' || $2 || ''%'')
        AND COALESCE(ib.is_visible, true) = true
    '
    INTO open_data_count
    USING safe_country, safe_industry;
  END IF;

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
  base AS (
    SELECT
      c.id AS contact_id,
      COALESCE(c.country_code, a.country_code, cp.country_code) AS country_code,
      c.language_code AS contact_language,
      a.industry,
      a.source_tier,
      cp.id AS contact_point_id,
      cp.normalized_value,
      cp.validation_status,
      COALESCE(score.score, 0) AS computed_score,
      perm.id AS permission_id,
      perm.status AS permission_status,
      perm.consented_at,
      perm.consent_source,
      perm.consent_text_version,
      EXISTS (
        SELECT 1
        FROM crm.consent_evidence ce
        WHERE ce.channel_permission_id = perm.id
          AND ce.contact_id = c.id
          AND ce.channel = 'whatsapp'
          AND ce.purpose = safe_purpose
      ) AS has_evidence,
      EXISTS (
        SELECT 1
        FROM crm.suppressions s
        WHERE s.status = 'active'
          AND s.identifier_type = 'whatsapp'
          AND (s.channel = 'whatsapp' OR s.channel IS NULL)
          AND s.normalized_identifier = cp.normalized_value
      ) AS suppressed
    FROM crm.contacts c
    LEFT JOIN primary_accounts pa ON pa.contact_id = c.id
    LEFT JOIN crm.accounts a ON a.id = pa.account_id
    LEFT JOIN LATERAL (
      SELECT cp1.*
      FROM crm.contact_points cp1
      WHERE cp1.contact_id = c.id
        AND cp1.point_type = 'whatsapp'
      ORDER BY cp1.is_primary DESC, cp1.updated_at DESC
      LIMIT 1
    ) cp ON true
    LEFT JOIN LATERAL (
      SELECT ss.score
      FROM crm.score_snapshots ss
      WHERE ss.contact_id = c.id
      ORDER BY ss.computed_at DESC
      LIMIT 1
    ) score ON true
    LEFT JOIN crm.channel_permissions perm
      ON perm.contact_id = c.id
     AND perm.channel = 'whatsapp'
     AND perm.purpose = safe_purpose
    WHERE c.contact_status = 'active'
      AND (safe_country IS NULL OR COALESCE(c.country_code, a.country_code, cp.country_code) = safe_country)
      AND (safe_industry IS NULL OR a.industry ILIKE '%' || safe_industry || '%')
      AND (safe_source_tier IS NULL OR a.source_tier = safe_source_tier)
      AND COALESCE(score.score, 0) >= safe_min_score
  ),
  funnel AS (
    SELECT
      count(*)::bigint AS active_contacts,
      count(*) FILTER (WHERE contact_point_id IS NOT NULL)::bigint AS with_whatsapp,
      count(*) FILTER (WHERE contact_point_id IS NOT NULL AND validation_status = 'valid')::bigint AS valid_whatsapp,
      count(*) FILTER (
        WHERE permission_status IN ('allowed', 'opted_in')
          AND consented_at IS NOT NULL
          AND NULLIF(btrim(consent_source), '') IS NOT NULL
          AND NULLIF(btrim(consent_text_version), '') IS NOT NULL
      )::bigint AS consent_ready,
      count(*) FILTER (WHERE has_evidence)::bigint AS evidenced,
      count(*) FILTER (WHERE suppressed OR permission_status IN ('opted_out', 'suppressed', 'invalid', 'complaint'))::bigint AS blocked,
      count(*) FILTER (
        WHERE contact_point_id IS NOT NULL
          AND validation_status = 'valid'
          AND permission_status IN ('allowed', 'opted_in')
          AND consented_at IS NOT NULL
          AND NULLIF(btrim(consent_source), '') IS NOT NULL
          AND NULLIF(btrim(consent_text_version), '') IS NOT NULL
          AND has_evidence
          AND NOT suppressed
          AND permission_status NOT IN ('opted_out', 'suppressed', 'invalid', 'complaint')
          AND (safe_language IS NULL OR contact_language IS NULL OR lower(replace(contact_language, '-', '_')) = safe_language)
      )::bigint AS eligible
    FROM base
  )
  SELECT 'open_data_prospects', 'Prospectos fuente abierta / directorio', open_data_count,
    CASE WHEN open_data_count > 0 THEN 'info' ELSE 'warning' END,
    'Negocios/prospectos disponibles para research, scoring o captacion de opt-in. No son destinatarios WhatsApp por si solos.',
    'Importar/enriquecer como cuentas CRM y llevarlos a opt-in mediante landing, QR, email permitido, llamada o solicitud entrante.',
    now_timestamp
  UNION ALL
  SELECT 'active_contacts', 'Contactos CRM activos', active_contacts,
    CASE WHEN active_contacts > 0 THEN 'good' ELSE 'warning' END,
    'Contactos activos que coinciden con pais, industria, tier y score.',
    'Si esta en 0: importar CSV/CRM o quitar filtros demasiado estrechos.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'with_whatsapp', 'Con numero WhatsApp registrado', with_whatsapp,
    CASE WHEN with_whatsapp > 0 THEN 'good' ELSE 'warning' END,
    'Contactos con contact_point tipo whatsapp.',
    'Si esta en 0: normalizar numeros en E.164 y guardar contact_points.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'valid_whatsapp', 'WhatsApp valido', valid_whatsapp,
    CASE WHEN valid_whatsapp > 0 THEN 'good' ELSE 'warning' END,
    'Numeros validados como utilizables en CRM.',
    'Si esta en 0: revisar normalizacion, pais y validation_status.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'consent_ready', 'Permiso por finalidad', consent_ready,
    CASE WHEN consent_ready > 0 THEN 'good' ELSE 'warning' END,
    'Permiso allowed/opted_in con fecha, fuente y version de texto.',
    'Si esta en 0: usar /whatsapp-consent, formulario/QR o importar CSV con evidencia verificable.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'evidenced', 'Evidencia de consentimiento', evidenced,
    CASE WHEN evidenced > 0 THEN 'good' ELSE 'warning' END,
    'Registro en consent_evidence para WhatsApp y la finalidad seleccionada.',
    'Si esta en 0: vincular evidencia antes de campanas.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'blocked', 'Bloqueados / supresion', blocked,
    CASE WHEN blocked = 0 THEN 'good' ELSE 'bad' END,
    'Opt-out, supresion, complaint, invalid o bloqueo activo.',
    'Nunca incluirlos en campanas hasta resolver legalmente.',
    now_timestamp
  FROM funnel
  UNION ALL
  SELECT 'eligible', 'Elegibles finales para dry run', eligible,
    CASE WHEN eligible > 0 THEN 'good' ELSE 'warning' END,
    'Contactos que pasan numero, permiso, evidencia, supresion e idioma.',
    'Si esta en 0: revisar la primera etapa anterior que este en 0 o warning.',
    now_timestamp
  FROM funnel;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_whatsapp_audience_diagnostics(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_audience_diagnostics(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC)
  TO service_role;

COMMENT ON FUNCTION public.crm_whatsapp_audience_diagnostics(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) IS
  'Read-only WhatsApp audience source/funnel diagnostics for admins. No writes and no sends.';

NOTIFY pgrst, 'reload schema';
