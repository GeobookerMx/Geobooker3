-- GEOSCORE_PHASE3: backend-only source coverage preview.
--
-- Purpose:
--   Show whether Geobooker has enough located business coverage by source,
--   country, city and category before any GeoScore profile can be activated.
--
-- Safety:
--   * Read-only aggregate diagnostics.
--   * No lead creation, no WhatsApp use, no score activation.
--   * Backend/service_role execution only.

BEGIN;

CREATE OR REPLACE FUNCTION public.geoscore_source_coverage_preview(
  p_country_code TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_country_code TEXT;
  v_city TEXT;
  v_category_key TEXT;
  v_limit INTEGER;
  v_registry JSONB := '[]'::jsonb;
  v_local JSONB := '[]'::jsonb;
  v_international JSONB := '[]'::jsonb;
  v_import_batches JSONB := '[]'::jsonb;
  v_candidates JSONB := '[]'::jsonb;
BEGIN
  v_country_code := nullif(upper(regexp_replace(coalesce(p_country_code, ''), '[^A-Za-z]', '', 'g')), '');
  IF v_country_code IS NOT NULL AND v_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'valid_country_code_required'
      USING ERRCODE = '22023';
  END IF;

  v_city := nullif(lower(trim(coalesce(p_city, ''))), '');
  v_category_key := nullif(public.geoscore_normalize_business_text(p_category), '');
  v_limit := least(greatest(coalesce(p_limit, 20), 1), 100);

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'sourceKey', source_key,
      'datasetKey', dataset_key,
      'displayName', display_name,
      'countryCode', country_code,
      'datasetVersion', dataset_version,
      'status', status,
      'commercialUseAllowed', commercial_use_allowed,
      'capabilities', capabilities,
      'qualityMetadata', quality_metadata,
      'updatedAt', updated_at
    )
    ORDER BY source_key, dataset_key, country_code NULLS LAST
  ), '[]'::jsonb)
    INTO v_registry
  FROM public.geo_source_registry
  WHERE v_country_code IS NULL
     OR country_code IS NULL
     OR country_code = v_country_code;

  IF to_regclass('public.businesses') IS NOT NULL THEN
    EXECUTE $sql$
      WITH rows AS (
        SELECT
          coalesce(source_type, 'native') AS source_type,
          upper(coalesce(country_code, 'MX')) AS country_code,
          coalesce(nullif(city_name, ''), nullif(city, ''), 'unknown') AS city,
          public.geoscore_normalize_business_text(category) AS category,
          COUNT(*) AS located_count,
          COUNT(*) FILTER (WHERE coalesce(is_verified, false)) AS verified_count,
          COUNT(*) FILTER (WHERE coalesce(is_claimed, false)) AS claimed_count
        FROM public.businesses
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND coalesce(is_visible, true) = true
          AND coalesce(status, 'approved') <> 'rejected'
          AND ($1 IS NULL OR upper(coalesce(country_code, 'MX')) = $1)
          AND ($2 IS NULL OR lower(coalesce(city_name, city, '')) = $2)
          AND ($3 IS NULL OR public.geoscore_normalize_business_text(category) = $3 OR public.geoscore_normalize_business_text(subcategory) = $3)
        GROUP BY 1, 2, 3, 4
        ORDER BY located_count DESC, source_type, city, category
        LIMIT $4
      )
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'table', 'businesses',
          'sourceType', source_type,
          'countryCode', country_code,
          'city', city,
          'category', category,
          'locatedCount', located_count,
          'verifiedCount', verified_count,
          'claimedCount', claimed_count
        )
        ORDER BY located_count DESC, source_type, city, category
      ), '[]'::jsonb)
      FROM rows
    $sql$
    INTO v_local
    USING v_country_code, v_city, v_category_key, v_limit;
  END IF;

  IF to_regclass('public.international_businesses') IS NOT NULL THEN
    EXECUTE $sql$
      WITH rows AS (
        SELECT
          coalesce(source_type, 'seed_overture') AS source_type,
          upper(country_code) AS country_code,
          coalesce(nullif(city, ''), 'unknown') AS city,
          public.geoscore_normalize_business_text(category) AS category,
          COUNT(*) AS located_count,
          COUNT(*) FILTER (WHERE coalesce(is_verified, false)) AS verified_count,
          COUNT(*) FILTER (WHERE coalesce(is_claimed, false)) AS claimed_count
        FROM public.international_businesses
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND coalesce(is_visible, true) = true
          AND coalesce(status, 'approved') = 'approved'
          AND coalesce(business_status, 'active') = 'active'
          AND ($1 IS NULL OR upper(country_code) = $1)
          AND ($2 IS NULL OR lower(city) = $2)
          AND ($3 IS NULL OR public.geoscore_normalize_business_text(category) = $3 OR public.geoscore_normalize_business_text(subcategory) = $3)
        GROUP BY 1, 2, 3, 4
        ORDER BY located_count DESC, source_type, city, category
        LIMIT $4
      )
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'table', 'international_businesses',
          'sourceType', source_type,
          'countryCode', country_code,
          'city', city,
          'category', category,
          'locatedCount', located_count,
          'verifiedCount', verified_count,
          'claimedCount', claimed_count
        )
        ORDER BY located_count DESC, source_type, city, category
      ), '[]'::jsonb)
      FROM rows
    $sql$
    INTO v_international
    USING v_country_code, v_city, v_category_key, v_limit;
  END IF;

  IF to_regclass('public.import_batches') IS NOT NULL THEN
    EXECUTE $sql$
      WITH rows AS (
        SELECT
          source_name,
          coalesce(source_version, 'unknown') AS source_version,
          upper(country_code) AS country_code,
          coalesce(nullif(city_name, ''), 'unknown') AS city,
          status,
          COUNT(*) AS batch_count,
          SUM(coalesce(row_count_raw, 0)) AS raw_rows,
          SUM(coalesce(row_count_published, 0)) AS published_rows,
          SUM(coalesce(row_count_errors, 0)) AS error_rows,
          max(finished_at) AS last_finished_at
        FROM public.import_batches
        WHERE ($1 IS NULL OR upper(country_code) = $1)
          AND ($2 IS NULL OR lower(coalesce(city_name, '')) = $2)
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY last_finished_at DESC NULLS LAST, raw_rows DESC
        LIMIT $3
      )
      SELECT coalesce(jsonb_agg(row_to_json(rows)::jsonb), '[]'::jsonb)
      FROM rows
    $sql$
    INTO v_import_batches
    USING v_country_code, v_city, v_limit;
  END IF;

  IF to_regclass('public.business_candidates') IS NOT NULL THEN
    EXECUTE $sql$
      WITH rows AS (
        SELECT
          coalesce(source_type, 'unknown') AS source_type,
          upper(coalesce(country_code, 'MX')) AS country_code,
          coalesce(nullif(city_name, ''), 'unknown') AS city,
          public.geoscore_normalize_business_text(coalesce(category_normalized, category_raw)) AS category,
          moderation_status,
          COUNT(*) AS candidate_count,
          COUNT(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) AS located_count,
          round(avg(coalesce(confidence_score, 0))::numeric, 3) AS avg_confidence
        FROM public.business_candidates
        WHERE ($1 IS NULL OR upper(coalesce(country_code, 'MX')) = $1)
          AND ($2 IS NULL OR lower(coalesce(city_name, '')) = $2)
          AND ($3 IS NULL OR public.geoscore_normalize_business_text(coalesce(category_normalized, category_raw)) = $3)
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY candidate_count DESC, source_type, city, category
        LIMIT $4
      )
      SELECT coalesce(jsonb_agg(row_to_json(rows)::jsonb), '[]'::jsonb)
      FROM rows
    $sql$
    INTO v_candidates
    USING v_country_code, v_city, v_category_key, v_limit;
  END IF;

  RETURN jsonb_build_object(
    'mode', 'preview_no_write',
    'scoreProduced', false,
    'filters', jsonb_build_object(
      'countryCode', v_country_code,
      'city', v_city,
      'category', v_category_key,
      'limit', v_limit
    ),
    'sourceRegistry', v_registry,
    'coverage', jsonb_build_object(
      'geobookerBusinesses', v_local,
      'internationalBusinesses', v_international,
      'importBatches', v_import_batches,
      'businessCandidates', v_candidates
    ),
    'readiness', jsonb_build_object(
      'productionScoreReady', false,
      'reason', 'Coverage preview only. Source licensing, deduplication, QA thresholds and active score profiles are still required.'
    ),
    'warnings', jsonb_build_array(
      'Coverage is not a lead list and must not be used for WhatsApp outbound without opt-in.',
      'Open data and Overture records can support scoring/research, not direct marketing consent.',
      'GeoScore remains fail-closed until explicit profile activation.'
    ),
    'checkedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.geoscore_source_coverage_preview(TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_source_coverage_preview(TEXT, TEXT, TEXT, INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.geoscore_source_coverage_preview(TEXT, TEXT, TEXT, INTEGER) IS
  'GeoScore Phase 3 backend-only aggregate coverage preview by source/country/city/category. No leads, no campaign use, no score activation.';

NOTIFY pgrst, 'reload schema';

COMMIT;
