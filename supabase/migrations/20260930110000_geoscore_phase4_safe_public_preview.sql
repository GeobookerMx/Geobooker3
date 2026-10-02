-- GeoScore Phase 4 hardening.
-- Public previews stay read-only and fail closed when local coverage is too low.

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
BEGIN
  v_country := upper(regexp_replace(coalesce(p_country_code, 'MX'), '[^A-Za-z]', '', 'g'));
  v_business_type := public.geoscore_normalize_business_text(p_business_type_key);
  v_radius := least(greatest(coalesce(p_radius_meters, 1000), 100), 5000);

  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'valid_coordinates_required' USING ERRCODE = '22023';
  END IF;

  IF v_country <> 'MX' THEN
    RETURN jsonb_build_object(
      'status', 'unsupported_country',
      'scoreProduced', false,
      'score', NULL,
      'countryCode', v_country,
      'recommendation', 'GeoScore verificable esta disponible primero para Mexico.',
      'warnings', jsonb_build_array('La cobertura internacional aun no ha pasado calibracion y QA.')
    );
  END IF;

  v_metrics := public.geoscore_geobooker_business_metrics_preview(
    p_lat,
    p_lng,
    v_country,
    v_business_type,
    v_radius
  );
  v_nearby := coalesce((v_metrics #>> '{totals,nearbyBusinesses}')::integer, 0);

  IF v_nearby < 5 THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_data',
      'scoreProduced', false,
      'score', NULL,
      'grade', NULL,
      'recommendation', 'Todavia no hay cobertura local suficiente para emitir una calificacion confiable.',
      'metrics', jsonb_build_object(
        'totalBusinesses', v_nearby,
        'radiusMeters', v_radius
      ),
      'dataQuality', v_metrics -> 'dataQuality',
      'warnings', jsonb_build_array(
        'Se requieren al menos 5 negocios geolocalizados en el radio.',
        'No se invento una calificacion con una muestra insuficiente.',
        'DENUE, INEGI y Overture deben ingresar mediante adaptadores con procedencia y QA.'
      )
    );
  END IF;

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

  RETURN v_result || jsonb_build_object(
    'status', 'success',
    'scoreProduced', true,
    'businessTypeKey', v_business_type,
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
) IS 'Read-only GeoScore preview with MX scope and minimum local coverage gate.';

NOTIFY pgrst, 'reload schema';

COMMIT;
