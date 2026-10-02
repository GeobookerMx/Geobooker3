-- GEOSCORE_PHASE3: first-party Geobooker business metrics preview.
--
-- Safety properties:
--   * Uses only aggregated first-party business directory data.
--   * Does not enable GeoScore feature flags.
--   * Does not write analyses or score decisions.
--   * Function execution is backend-only for service_role.

BEGIN;

CREATE OR REPLACE FUNCTION public.geoscore_normalize_business_text(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT regexp_replace(
    translate(lower(trim(coalesce(p_value, ''))), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9_]+',
    '_',
    'g'
  )
$$;

CREATE OR REPLACE FUNCTION public.geoscore_geobooker_business_metrics_preview(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_country_code TEXT DEFAULT 'MX',
  p_business_type_key TEXT DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_country_code TEXT;
  v_business_type_key TEXT;
  v_radius_meters INTEGER;
  v_center public.geography;
  v_category_aliases TEXT[];
  v_area_km2 NUMERIC;
  v_result JSONB;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90
     OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'valid_coordinates_required'
      USING ERRCODE = '22023';
  END IF;

  v_country_code := upper(regexp_replace(coalesce(p_country_code, 'MX'), '[^A-Za-z]', '', 'g'));
  IF v_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'valid_country_code_required'
      USING ERRCODE = '22023';
  END IF;

  v_business_type_key := public.geoscore_normalize_business_text(p_business_type_key);
  v_radius_meters := least(greatest(coalesce(p_radius_meters, 1000), 100), 10000);
  v_center := public.ST_SetSRID(public.ST_MakePoint(p_lng, p_lat), 4326)::public.geography;
  v_area_km2 := pi()::numeric * power((v_radius_meters::numeric / 1000), 2);

  v_category_aliases := CASE v_business_type_key
    WHEN 'restaurant' THEN ARRAY['restaurant', 'restaurante', 'restaurantes', 'comida']
    WHEN 'restaurante' THEN ARRAY['restaurant', 'restaurante', 'restaurantes', 'comida']
    WHEN 'restaurantes' THEN ARRAY['restaurant', 'restaurante', 'restaurantes', 'comida']
    WHEN 'cafe' THEN ARRAY['cafe', 'cafeteria', 'cafeterias', 'coffee']
    WHEN 'cafeteria' THEN ARRAY['cafe', 'cafeteria', 'cafeterias', 'coffee']
    WHEN 'gym' THEN ARRAY['gym', 'gimnasio', 'gimnasios', 'fitness']
    WHEN 'gimnasio' THEN ARRAY['gym', 'gimnasio', 'gimnasios', 'fitness']
    WHEN 'pharmacy' THEN ARRAY['pharmacy', 'farmacia', 'farmacias', 'salud']
    WHEN 'farmacia' THEN ARRAY['pharmacy', 'farmacia', 'farmacias', 'salud']
    WHEN 'car_wash' THEN ARRAY['car_wash', 'carwash', 'autolavado', 'lavado_de_autos', 'hogar_autos']
    WHEN 'autolavado' THEN ARRAY['car_wash', 'carwash', 'autolavado', 'lavado_de_autos', 'hogar_autos']
    WHEN 'local_retail' THEN ARRAY['local_retail', 'retail', 'tienda', 'tiendas', 'comercio', 'servicios']
    ELSE ARRAY[v_business_type_key]
  END;

  WITH located AS (
    SELECT
      id,
      public.geoscore_normalize_business_text(category) AS category_key,
      public.geoscore_normalize_business_text(subcategory) AS subcategory_key,
      coalesce(source_type, 'native') AS source_type,
      coalesce(is_verified, false) AS is_verified,
      coalesce(is_claimed, false) AS is_claimed,
      coalesce(geog, public.ST_SetSRID(public.ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::public.geography) AS business_geog
    FROM public.businesses
    WHERE upper(coalesce(country_code, 'MX')) = v_country_code
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND coalesce(is_visible, true) = true
      AND coalesce(status, 'approved') <> 'rejected'
      AND coalesce(business_status, 'active') NOT IN ('closed', 'inactive', 'suspended')
  ),
  nearby AS (
    SELECT
      *,
      public.ST_Distance(business_geog, v_center) AS distance_meters,
      category_key = ANY(v_category_aliases)
        OR subcategory_key = ANY(v_category_aliases) AS is_competitor
    FROM located
    WHERE public.ST_DWithin(business_geog, v_center, v_radius_meters)
  ),
  counts AS (
    SELECT
      COUNT(*) AS nearby_businesses,
      COUNT(*) FILTER (WHERE is_competitor) AS competitor_businesses,
      COUNT(*) FILTER (WHERE NOT is_competitor) AS other_businesses,
      COUNT(*) FILTER (WHERE is_verified) AS verified_businesses,
      COUNT(*) FILTER (WHERE is_claimed) AS claimed_businesses,
      COUNT(DISTINCT source_type) AS source_type_count,
      min(distance_meters) AS nearest_distance_meters
    FROM nearby
  ),
  category_rows AS (
    SELECT
      category_key AS category,
      COUNT(*) AS business_count,
      COUNT(*) FILTER (WHERE is_competitor) AS competitor_count
    FROM nearby
    GROUP BY category_key
    ORDER BY COUNT(*) DESC, category_key
    LIMIT 10
  ),
  category_breakdown AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'category', category,
          'businessCount', business_count,
          'competitorCount', competitor_count
        )
        ORDER BY business_count DESC, category
      ),
      '[]'::jsonb
    ) AS payload
    FROM category_rows
  )
  SELECT jsonb_build_object(
    'mode', 'preview_no_write',
    'scoreProduced', false,
    'sourceKey', 'geobooker_businesses',
    'datasetKey', 'businesses_current',
    'dataSnapshotVersion', to_char(current_date, 'YYYY-MM-DD'),
    'countryCode', v_country_code,
    'businessTypeKey', nullif(v_business_type_key, ''),
    'radiusMeters', v_radius_meters,
    'center', jsonb_build_object('lat', p_lat, 'lng', p_lng),
    'totals', jsonb_build_object(
      'nearbyBusinesses', counts.nearby_businesses,
      'competitorBusinesses', counts.competitor_businesses,
      'otherBusinesses', counts.other_businesses,
      'verifiedBusinesses', counts.verified_businesses,
      'claimedBusinesses', counts.claimed_businesses,
      'sourceTypeCount', counts.source_type_count,
      'nearestDistanceMeters', CASE
        WHEN counts.nearest_distance_meters IS NULL THEN NULL
        ELSE round(counts.nearest_distance_meters::numeric, 1)
      END
    ),
    'density', jsonb_build_object(
      'areaKm2', round(v_area_km2, 4),
      'businessesPerKm2', round((counts.nearby_businesses::numeric / nullif(v_area_km2, 0)), 2),
      'competitorsPerKm2', round((counts.competitor_businesses::numeric / nullif(v_area_km2, 0)), 2)
    ),
    'dataQuality', jsonb_build_object(
      'observedOrEstimated', 'OBSERVED',
      'confidenceScore', CASE
        WHEN counts.nearby_businesses >= 50 THEN 80
        WHEN counts.nearby_businesses >= 20 THEN 65
        WHEN counts.nearby_businesses >= 10 THEN 50
        WHEN counts.nearby_businesses > 0 THEN 35
        ELSE 15
      END,
      'sampleSize', counts.nearby_businesses,
      'limitation', 'Only first-party Geobooker businesses are included; DENUE/INEGI/Overture adapters are not active in this preview.'
    ),
    'categoryBreakdown', category_breakdown.payload,
    'warnings', jsonb_build_array(
      'GeoScore remains disabled for production decisions.',
      'This preview is an aggregate market signal, not a final recommendation.',
      'No WhatsApp campaigns or CRM leads are created from this metric.'
    )
  )
    INTO v_result
  FROM counts, category_breakdown;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.geoscore_normalize_business_text(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_normalize_business_text(TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.geoscore_geobooker_business_metrics_preview(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT,
  TEXT,
  INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_geobooker_business_metrics_preview(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT,
  TEXT,
  INTEGER
) TO service_role;

COMMENT ON FUNCTION public.geoscore_geobooker_business_metrics_preview(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT,
  TEXT,
  INTEGER
) IS
  'GeoScore Phase 3 backend-only aggregate preview using first-party Geobooker businesses. No score, no writes, no campaign decisions.';

NOTIFY pgrst, 'reload schema';

COMMIT;
