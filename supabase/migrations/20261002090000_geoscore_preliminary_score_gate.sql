-- GEOSCORE: Fix gate — GeoScore Preliminar para 1-4 negocios
-- Con 0 negocios sigue sin score (honesto).
-- Con 1-4 negocios emite GeoScore Preliminar (no certificable).
-- Con 5+ negocios emite GeoScore Verificable (certificable).

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

  -- Países distintos de MX: score preliminar basado en estimaciones,
  -- sin datos locales validados todavía.
  IF v_country <> 'MX' THEN
    v_result := public.geoscore_calculate_location_score(
      p_business_type_key,
      p_lat,
      p_lng,
      v_country,
      v_radius,
      false,
      NULL
    );
    RETURN v_result || jsonb_build_object(
      'status', 'preliminary',
      'scoreProduced', true,
      'isPreliminary', true,
      'isCertifiable', false,
      'businessTypeKey', v_business_type,
      'countryCode', v_country,
      'disclaimer', 'GeoScore Preliminar: cobertura internacional en calibracion. No certificable en esta version.',
      'warnings', jsonb_build_array(
        'Los datos internacionales estan en proceso de validacion y QA.',
        'Este resultado es orientativo. No emitas decisiones criticas solo con este indicador.'
      )
    );
  END IF;

  -- Obtener métricas de negocios cercanos (MX: Geobooker + Overture)
  v_metrics := public.geoscore_geobooker_business_metrics_preview(
    p_lat,
    p_lng,
    v_country,
    v_business_type,
    v_radius
  );
  v_nearby := coalesce((v_metrics #>> '{totals,nearbyBusinesses}')::integer, 0);

  -- 0 negocios: sin cobertura, no emitimos nada
  IF v_nearby = 0 THEN
    RETURN jsonb_build_object(
      'status', 'no_coverage',
      'scoreProduced', false,
      'score', NULL,
      'grade', NULL,
      'recommendation', 'No se encontraron negocios geolocalizados en este radio. Prueba con un radio mayor o una zona comercial.',
      'metrics', jsonb_build_object(
        'totalBusinesses', 0,
        'radiusMeters', v_radius
      ),
      'dataQuality', v_metrics -> 'dataQuality',
      'warnings', jsonb_build_array(
        'Sin datos locales en el radio seleccionado.',
        'Selecciona una de las zonas predefinidas o usa un radio mayor.'
      )
    );
  END IF;

  -- Calcular score base (aplica para 1+ negocios)
  v_search_term := CASE v_business_type
    WHEN 'restaurant'   THEN 'restaurante'
    WHEN 'cafe'         THEN 'cafeteria'
    WHEN 'pharmacy'     THEN 'farmacia'
    WHEN 'gym'          THEN 'gimnasio'
    WHEN 'car_wash'     THEN 'autolavado'
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

  -- 1-4 negocios: GeoScore Preliminar (no certificable)
  IF v_nearby < 5 THEN
    RETURN v_result || jsonb_build_object(
      'status', 'preliminary',
      'scoreProduced', true,
      'isPreliminary', true,
      'isCertifiable', false,
      'businessTypeKey', v_business_type,
      'dataQuality', v_metrics -> 'dataQuality',
      'disclaimer', 'GeoScore Preliminar: muestra local reducida. El score es orientativo; no es certificable con menos de 5 negocios geolocalizados.',
      'warnings', jsonb_build_array(
        format('Negocios geolocalizados encontrados: %s. Se requieren al menos 5 para GeoScore Verificable.', v_nearby),
        'El certificado oficial requiere cobertura local verificada.',
        'Este indicador es util como referencia inicial, no como decision final.'
      )
    );
  END IF;

  -- 5+ negocios: GeoScore Verificable y Certificable
  RETURN v_result || jsonb_build_object(
    'status', 'success',
    'scoreProduced', true,
    'isPreliminary', false,
    'isCertifiable', true,
    'businessTypeKey', v_business_type,
    'dataQuality', v_metrics -> 'dataQuality',
    'disclaimer', 'Indicador exploratorio basado en la cobertura disponible; no garantiza ventas ni rentabilidad.'
  );
END;
$$;

-- Permisos sin cambios: solo service_role
REVOKE ALL ON FUNCTION public.geoscore_calculate_location_score_safe(
  TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.geoscore_calculate_location_score_safe(
  TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER
) TO service_role;

COMMENT ON FUNCTION public.geoscore_calculate_location_score_safe IS
  'GeoScore safe preview: 0 negocios = sin cobertura; 1-4 = Preliminar (no certificable); 5+ = Verificable (certificable).';

NOTIFY pgrst, 'reload schema';
COMMIT;
