-- Read-only validation for the public-safe GeoScore preview.

SELECT
  to_regprocedure(
    'public.geoscore_calculate_location_score_safe(text,double precision,double precision,text,integer)'
  ) IS NOT NULL AS safe_preview_exists,
  has_function_privilege(
    'anon',
    'public.geoscore_calculate_location_score_safe(text,double precision,double precision,text,integer)',
    'EXECUTE'
  ) AS anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.geoscore_calculate_location_score_safe(text,double precision,double precision,text,integer)',
    'EXECUTE'
  ) AS authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.geoscore_calculate_location_score_safe(text,double precision,double precision,text,integer)',
    'EXECUTE'
  ) AS service_role_can_execute;

SELECT public.geoscore_calculate_location_score_safe(
  'restaurant',
  19.432608,
  -99.133209,
  'MX',
  1000
) AS mexico_preview;

SELECT public.geoscore_calculate_location_score_safe(
  'restaurant',
  25.7617,
  -80.1918,
  'US',
  1000
) AS unsupported_country_preview;
