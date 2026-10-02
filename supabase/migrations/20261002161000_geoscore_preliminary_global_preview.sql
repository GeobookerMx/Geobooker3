-- GeoScore public preview should not feel broken when coverage is low.
-- 0 located businesses: no score.
-- 1-4 located businesses: preliminary score, not certificate-eligible.
-- 5+ located businesses: full preview, certificate-eligible.

BEGIN;

CREATE OR REPLACE FUNCTION public.geoscore_calculate_location_score_safe(
  p_business_type_key TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_country_code TEXT DEFAULT 'MX',
  p_radius_meters INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_country TEXT;
  v_business_type TEXT;
  v_search_term TEXT;
  v_radius INTEGER;
  v_metrics JSONB;
  v_nearby INTEGER;
  v_result JSONB;
  v_is_preliminary BOOLEAN := false;
BEGIN
  v_country := upper(regexp_replace(coalesce(p_country_code, 'MX'), '[^A-Za-z]', '', 'g'));
  v_business_type := public.geoscore_normalize_business_text(p_business_type_key);
  v_radius := least(greatest(coalesce(p_radius_meters, 1000), 100), 5000);

  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'valid_coordinates_required' USING ERRCODE = '22023';
  END IF;

  v_metrics := public.geoscore_geobooker_business_metrics_preview(
    p_lat,
    p_lng,
    v_country,
    v_business_type,
    v_radius
  );
  v_nearby := coalesce((v_metrics #>> '{totals,nearbyBusinesses}')::integer, 0);

  IF v_nearby < 1 THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_data',
      'scoreProduced', false,
      'score', NULL,
      'grade', NULL,
      'countryCode', v_country,
      'businessTypeKey', v_business_type,
      'certificationEligible', false,
      'recommendation', 'Todavia no hay cobertura local suficiente para emitir una calificacion.',
      'metrics', jsonb_build_object(
        'totalBusinesses', v_nearby,
        'radiusMeters', v_radius
      ),
      'dataQuality', v_metrics -> 'dataQuality',
      'warnings', jsonb_build_array(
        'No se encontraron negocios geolocalizados suficientes en el radio.',
        'Prueba ampliar el radio o elegir otro polo comercial.'
      )
    );
  END IF;

  v_is_preliminary := v_nearby < 5;

  v_search_term := CASE v_business_type
    WHEN 'restaurant' THEN 'restaurante'
    WHEN 'cafe' THEN 'cafeteria'
    WHEN 'pharmacy' THEN 'farmacia'
    WHEN 'gym' THEN 'gimnasio'
    WHEN 'car_wash' THEN 'autolavado'
    WHEN 'local_retail' THEN 'tienda'
    ELSE v_business_type
  END;

  v_result := public.geoscore_calculate_location_score(
    v_search_term,
    p_lat,
    p_lng,
    v_country,
    v_radius,
    false,
    NULL
  );

  IF v_is_preliminary THEN
    RETURN v_result || jsonb_build_object(
      'status', 'preliminary',
      'scoreProduced', true,
      'preliminary', true,
      'certificationEligible', false,
      'businessTypeKey', v_business_type,
      'countryCode', v_country,
      'dataQuality', v_metrics -> 'dataQuality',
      'recommendation', coalesce(v_result->>'recommendation', 'Resultado preliminar generado con muestra reducida.') || ' Resultado preliminar: la muestra local es reducida y conviene ampliar radio o validar con mas fuentes antes de decidir inversion.',
      'warnings', jsonb_build_array(
        'Muestra reducida: menos de 5 negocios geolocalizados en el radio.',
        'Se permite estudio preliminar, pero no certificado verificable.',
        'Para mayor confianza, amplia el radio o elige un polo comercial con mas cobertura.'
      ),
      'disclaimer', 'Indicador exploratorio preliminar. No garantiza ventas, rentabilidad ni disponibilidad definitiva de mercado.'
    );
  END IF;

  RETURN v_result || jsonb_build_object(
    'status', 'success',
    'scoreProduced', true,
    'preliminary', false,
    'certificationEligible', true,
    'businessTypeKey', v_business_type,
    'countryCode', v_country,
    'dataQuality', v_metrics -> 'dataQuality',
    'disclaimer', 'Indicador exploratorio basado en la cobertura disponible; no garantiza ventas ni rentabilidad.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.geoscore_calculate_location_score_safe(
  TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_calculate_location_score_safe(
  TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER
) TO service_role;

COMMENT ON FUNCTION public.geoscore_calculate_location_score_safe(
  TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER
) IS 'Read-only GeoScore preview. Produces preliminary non-certifiable results for low coverage and full certifiable previews for sufficient coverage.';

NOTIFY pgrst, 'reload schema';

COMMIT;
