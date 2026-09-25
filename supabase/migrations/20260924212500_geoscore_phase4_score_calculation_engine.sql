-- GEOSCORE_PHASE4: Multi-factor Location Intelligence & Score Engine
--
-- Calculates 5 commercial location pillars:
--   1. Competencia directa y saturación (Direct Competition)
--   2. Complementariedad y tracción comercial (Synergy / Complementary POIs)
--   3. Densidad comercial y centralidad (Commercial Density)
--   4. Accesibilidad y conectividad (Accessibility Proxy)
--   5. Calidad de datos y confianza (Data Quality & Confidence)

BEGIN;

CREATE OR REPLACE FUNCTION public.geoscore_calculate_location_score(
  p_business_type_key TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_country_code TEXT DEFAULT 'MX',
  p_radius_meters INTEGER DEFAULT 1000,
  p_save_analysis BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_country TEXT;
  v_business_type TEXT;
  v_radius INTEGER;
  
  -- Counts
  v_total_businesses_in_radius INTEGER := 0;
  v_direct_competitors_count INTEGER := 0;
  v_complementary_count INTEGER := 0;
  v_verified_count INTEGER := 0;
  v_claimed_count INTEGER := 0;
  
  -- Sub-scores (0 to 100)
  v_competition_score NUMERIC(5, 2) := 50;
  v_complementarity_score NUMERIC(5, 2) := 50;
  v_density_score NUMERIC(5, 2) := 50;
  v_accessibility_score NUMERIC(5, 2) := 50;
  v_data_confidence_score NUMERIC(5, 2) := 50;
  
  -- Final Aggregate
  v_final_score NUMERIC(5, 2) := 50;
  v_grade TEXT := 'B';
  v_recommendation TEXT := '';
  
  -- Analysis Record
  v_analysis_id UUID;
  v_breakdown JSONB;
  v_strengths JSONB := '[]'::jsonb;
  v_risks JSONB := '[]'::jsonb;
BEGIN
  -- 1. Input sanitization
  v_country := upper(NULLIF(regexp_replace(COALESCE(p_country_code, 'MX'), '[^A-Za-z]', '', 'g'), ''));
  v_business_type := lower(btrim(COALESCE(p_business_type_key, 'restaurant')));
  v_radius := LEAST(GREATEST(COALESCE(p_radius_meters, 1000), 100), 5000);

  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'valid_coordinates_required' USING ERRCODE = '22023';
  END IF;

  -- 2. Measure First-Party + Open Data Businesses in Radius (Haversine approximation in meters)
  IF to_regclass('public.businesses') IS NOT NULL THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (
        WHERE lower(coalesce(category, '')) ILIKE '%' || v_business_type || '%'
           OR lower(coalesce(subcategory, '')) ILIKE '%' || v_business_type || '%'
      ),
      COUNT(*) FILTER (
        WHERE lower(coalesce(category, '')) ILIKE '%banco%'
           OR lower(coalesce(category, '')) ILIKE '%farmacia%'
           OR lower(coalesce(category, '')) ILIKE '%supermercado%'
           OR lower(coalesce(category, '')) ILIKE '%oficina%'
           OR lower(coalesce(category, '')) ILIKE '%metro%'
           OR lower(coalesce(category, '')) ILIKE '%universidad%'
           OR lower(coalesce(category, '')) ILIKE '%comercial%'
      ),
      COUNT(*) FILTER (WHERE coalesce(is_verified, false)),
      COUNT(*) FILTER (WHERE coalesce(is_claimed, false))
    INTO
      v_total_businesses_in_radius,
      v_direct_competitors_count,
      v_complementary_count,
      v_verified_count,
      v_claimed_count
    FROM public.businesses
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND coalesce(is_visible, true) = true
      AND coalesce(status, 'approved') <> 'rejected'
      AND (
        6371000 * 2 * asin(sqrt(
          sin(radians(latitude - p_lat) / 2) ^ 2 +
          cos(radians(p_lat)) * cos(radians(latitude)) *
          sin(radians(longitude - p_lng) / 2) ^ 2
        ))
      ) <= v_radius;
  END IF;

  -- If international table exists and in non-MX or supplement
  IF v_total_businesses_in_radius = 0 AND to_regclass('public.international_businesses') IS NOT NULL THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (
        WHERE lower(coalesce(category, '')) ILIKE '%' || v_business_type || '%'
           OR lower(coalesce(subcategory, '')) ILIKE '%' || v_business_type || '%'
      ),
      COUNT(*) FILTER (
        WHERE lower(coalesce(category, '')) ILIKE '%bank%'
           OR lower(coalesce(category, '')) ILIKE '%pharmacy%'
           OR lower(coalesce(category, '')) ILIKE '%grocery%'
           OR lower(coalesce(category, '')) ILIKE '%retail%'
           OR lower(coalesce(category, '')) ILIKE '%office%'
      ),
      COUNT(*) FILTER (WHERE coalesce(is_verified, false)),
      COUNT(*) FILTER (WHERE coalesce(is_claimed, false))
    INTO
      v_total_businesses_in_radius,
      v_direct_competitors_count,
      v_complementary_count,
      v_verified_count,
      v_claimed_count
    FROM public.international_businesses
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND coalesce(is_visible, true) = true
      AND coalesce(status, 'approved') = 'approved'
      AND (
        6371000 * 2 * asin(sqrt(
          sin(radians(latitude - p_lat) / 2) ^ 2 +
          cos(radians(p_lat)) * cos(radians(latitude)) *
          sin(radians(longitude - p_lng) / 2) ^ 2
        ))
      ) <= v_radius;
  END IF;

  -- 3. Calculate Pillar Sub-scores

  -- Pillar 1: Direct Competition (Sweet spot: 2 to 8 competitors in 1km gives 85-95 score; 0 is unproven; >25 is highly saturated)
  IF v_direct_competitors_count = 0 THEN
    v_competition_score := 55.0;
  ELSIF v_direct_competitors_count BETWEEN 1 AND 3 THEN
    v_competition_score := 85.0;
  ELSIF v_direct_competitors_count BETWEEN 4 AND 10 THEN
    v_competition_score := 95.0;
  ELSIF v_direct_competitors_count BETWEEN 11 AND 25 THEN
    v_competition_score := 75.0;
  ELSE
    v_competition_score := 45.0; -- Saturation penalty
  END IF;

  -- Pillar 2: Complementary Synergy (More banks, transit, retail = higher organic traffic)
  IF v_complementary_count >= 15 THEN
    v_complementarity_score := 95.0;
  ELSIF v_complementary_count >= 8 THEN
    v_complementarity_score := 85.0;
  ELSIF v_complementary_count >= 3 THEN
    v_complementarity_score := 70.0;
  ELSE
    v_complementarity_score := 50.0;
  END IF;

  -- Pillar 3: Commercial Density (Total businesses per area)
  IF v_total_businesses_in_radius >= 40 THEN
    v_density_score := 95.0;
  ELSIF v_total_businesses_in_radius >= 20 THEN
    v_density_score := 85.0;
  ELSIF v_total_businesses_in_radius >= 8 THEN
    v_density_score := 70.0;
  ELSIF v_total_businesses_in_radius >= 2 THEN
    v_density_score := 55.0;
  ELSE
    v_density_score := 35.0;
  END IF;

  -- Pillar 4: Accessibility & Urban Centrality Proxy
  v_accessibility_score := round((v_density_score * 0.6 + v_complementarity_score * 0.4)::numeric, 2);

  -- Pillar 5: Data Quality & Confidence
  IF v_total_businesses_in_radius >= 15 THEN
    v_data_confidence_score := 90.0;
  ELSIF v_total_businesses_in_radius >= 5 THEN
    v_data_confidence_score := 75.0;
  ELSIF v_total_businesses_in_radius >= 1 THEN
    v_data_confidence_score := 45.0;
  ELSE
    v_data_confidence_score := 20.0;
  END IF;

  -- Weighted Final GeoScore
  -- Weights: Competition (25%), Complementarity (25%), Density (25%), Accessibility (15%), Confidence (10%)
  v_final_score := round((
    (v_competition_score * 0.25) +
    (v_complementarity_score * 0.25) +
    (v_density_score * 0.25) +
    (v_accessibility_score * 0.15) +
    (v_data_confidence_score * 0.10)
  )::numeric, 1);

  -- Determine Grade & Actionable Recommendation
  IF v_final_score >= 90 THEN
    v_grade := 'A+';
    v_recommendation := 'Excelente ubicación comercial con alta afluencia y demanda validada.';
  ELSIF v_final_score >= 80 THEN
    v_grade := 'A';
    v_recommendation := 'Ubicación sólida con buen potencial comercial y sinergia de zona.';
  ELSIF v_final_score >= 65 THEN
    v_grade := 'B';
    v_recommendation := 'Ubicación viable; recomendable verificar diferenciador frente a competidores locales.';
  ELSIF v_final_score >= 50 THEN
    v_grade := 'C';
    v_recommendation := 'Zona en desarrollo o con tráfico peatonal moderado. Requiere estrategia de atracción.';
  ELSE
    v_grade := 'D';
    v_recommendation := 'Zona con baja densidad comercial registrada o alta saturación.';
  END IF;

  -- Build Strengths & Risks
  IF v_complementary_count >= 5 THEN
    v_strengths := v_strengths || jsonb_build_array('Alta sinergia con comercios complementarios (bancos/servicios)');
  END IF;
  IF v_total_businesses_in_radius >= 15 THEN
    v_strengths := v_strengths || jsonb_build_array('Polo comercial activo y consolidado');
  END IF;
  IF v_direct_competitors_count BETWEEN 2 AND 8 THEN
    v_strengths := v_strengths || jsonb_build_array('Presencia equilibrada de competidores que valida demanda');
  END IF;

  IF v_direct_competitors_count > 15 THEN
    v_risks := v_risks || jsonb_build_array('Alta saturación de competidores directos en el radio');
  END IF;
  IF v_total_businesses_in_radius < 5 THEN
    v_risks := v_risks || jsonb_build_array('Baja densidad de datos local registrada');
  END IF;

  v_breakdown := jsonb_build_object(
    'competition', jsonb_build_object('score', v_competition_score, 'count', v_direct_competitors_count, 'weight', 0.25),
    'complementarity', jsonb_build_object('score', v_complementarity_score, 'count', v_complementary_count, 'weight', 0.25),
    'density', jsonb_build_object('score', v_density_score, 'totalNearby', v_total_businesses_in_radius, 'weight', 0.25),
    'accessibility', jsonb_build_object('score', v_accessibility_score, 'weight', 0.15),
    'confidence', jsonb_build_object('score', v_data_confidence_score, 'weight', 0.10)
  );

  -- Save record if requested
  IF p_save_analysis AND to_regclass('public.location_analyses') IS NOT NULL THEN
    INSERT INTO public.location_analyses (
      target_location,
      country_code,
      business_type_key,
      radius_meters,
      score,
      confidence_score,
      analysis_status,
      decision_summary,
      created_by
    ) VALUES (
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      v_country,
      v_business_type,
      v_radius,
      v_final_score,
      v_data_confidence_score,
      'COMPLETED',
      jsonb_build_object('grade', v_grade, 'recommendation', v_recommendation, 'breakdown', v_breakdown),
      p_user_id
    )
    RETURNING id INTO v_analysis_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'score', v_final_score,
    'grade', v_grade,
    'recommendation', v_recommendation,
    'strengths', v_strengths,
    'risks', v_risks,
    'breakdown', v_breakdown,
    'metrics', jsonb_build_object(
      'totalBusinesses', v_total_businesses_in_radius,
      'competitors', v_direct_competitors_count,
      'complementary', v_complementary_count,
      'verified', v_verified_count,
      'claimed', v_claimed_count,
      'radiusMeters', v_radius
    ),
    'input', jsonb_build_object(
      'lat', p_lat,
      'lng', p_lng,
      'businessType', v_business_type,
      'countryCode', v_country
    ),
    'analysisId', v_analysis_id,
    'calculatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.geoscore_calculate_location_score(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, BOOLEAN, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_calculate_location_score(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, BOOLEAN, UUID)
  TO service_role;

COMMENT ON FUNCTION public.geoscore_calculate_location_score IS
  'GeoScore Phase 4 calculation engine: competition, synergy, density, accessibility, and confidence pillars.';

NOTIFY pgrst, 'reload schema';

COMMIT;
