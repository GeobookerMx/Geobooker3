-- Read-only validation for GeoScore Phase 3 Geobooker business metrics preview.

SELECT jsonb_pretty(jsonb_build_object(
  'preview', public.geoscore_geobooker_business_metrics_preview(
    19.432608,
    -99.133209,
    'MX',
    'restaurant',
    1000
  ),
  'privileges', jsonb_build_object(
    'anonCanExecute', has_function_privilege(
      'anon',
      'public.geoscore_geobooker_business_metrics_preview(double precision,double precision,text,text,integer)',
      'EXECUTE'
    ),
    'authenticatedCanExecute', has_function_privilege(
      'authenticated',
      'public.geoscore_geobooker_business_metrics_preview(double precision,double precision,text,text,integer)',
      'EXECUTE'
    ),
    'serviceRoleCanExecute', has_function_privilege(
      'service_role',
      'public.geoscore_geobooker_business_metrics_preview(double precision,double precision,text,text,integer)',
      'EXECUTE'
    )
  )
)) AS geoscore_phase3_validation;
