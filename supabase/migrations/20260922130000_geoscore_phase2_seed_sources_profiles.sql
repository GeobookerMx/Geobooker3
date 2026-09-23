-- GEOSCORE_PHASE2 seed: Mexico source registry + inactive V1 score profiles.
--
-- Safety:
--   * Does not enable GeoScore feature flags.
--   * Does not activate score profiles.
--   * Does not ingest raw datasets.
--   * Does not change businesses.location / businesses.geog.
--   * Does not grant browser write access.

BEGIN;

INSERT INTO public.geo_source_registry (
  source_key,
  dataset_key,
  display_name,
  country_code,
  dataset_version,
  source_date,
  ingested_at,
  refresh_frequency,
  license_name,
  license_reference,
  commercial_use_allowed,
  redistribution_constraints,
  capabilities,
  quality_metadata,
  status
)
VALUES
  (
    'inegi',
    'denue',
    'INEGI DENUE — Directorio Estadístico Nacional de Unidades Económicas',
    'MX',
    'pending-version',
    NULL,
    NULL,
    'versioned_snapshot',
    'INEGI open data / terms require final legal validation',
    'https://www.inegi.org.mx/servicios/api_denue.html',
    FALSE,
    'Validate attribution, redistribution and dataset-specific terms before commercial activation.',
    '{
      "supports_poi_competition": true,
      "supports_complementary_businesses": true,
      "supports_business_size_proxy": true,
      "supports_source_ids": true,
      "requires_deduplication": true
    }'::jsonb,
    '{
      "coverage": "national",
      "freshness_status": "pending_ingestion",
      "risk_notes": ["business may no longer be active", "not a direct demand signal"]
    }'::jsonb,
    'draft'
  ),
  (
    'inegi',
    'censo_2020_ageb_manzana',
    'INEGI Censo 2020 — AGEB/manzana urbana',
    'MX',
    '2020-pending-extract',
    DATE '2020-01-01',
    NULL,
    'decennial_snapshot',
    'INEGI open data / terms require final legal validation',
    'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/fd_agebmza_urbana_cpv2020.pdf',
    FALSE,
    'Use as historical aggregate context; do not present as current exact population.',
    '{
      "supports_population_context": true,
      "supports_sociodemographic_context": true,
      "supports_point_in_polygon": true,
      "requires_geographic_join": true
    }'::jsonb,
    '{
      "coverage": "urban_blocks_and_ageb",
      "freshness_status": "historical_2020",
      "risk_notes": ["population values may be stale", "privacy thresholds required for small areas"]
    }'::jsonb,
    'draft'
  ),
  (
    'sict',
    'datos_viales',
    'SICT — Datos viales',
    'MX',
    'pending-version',
    NULL,
    NULL,
    'annual_or_dataset_snapshot',
    'Datos.gob.mx / SICT terms require final validation',
    'https://www.datos.gob.mx/es/dataset/datos_viales',
    FALSE,
    'Coverage is not universal; do not infer pedestrian traffic from road traffic.',
    '{
      "supports_vehicle_accessibility_proxy": true,
      "supports_road_context": true,
      "coverage_is_partial": true
    }'::jsonb,
    '{
      "coverage": "selected_roads",
      "freshness_status": "pending_ingestion",
      "risk_notes": ["not pedestrian traffic", "not universal street coverage"]
    }'::jsonb,
    'draft'
  ),
  (
    'overture',
    'places',
    'Overture Maps — Places',
    NULL,
    'pending-release',
    NULL,
    NULL,
    'monthly_or_release_snapshot',
    'CDLA Permissive 2.0 / Overture terms require final validation',
    'https://docs.overturemaps.org/guides/places/',
    FALSE,
    'Maintain attribution, release version and deduplication against DENUE/Geobooker.',
    '{
      "supports_global_places": true,
      "supports_gers_id": true,
      "supports_taxonomy": true,
      "requires_deduplication": true,
      "future_international_expansion": true
    }'::jsonb,
    '{
      "coverage": "global_variable_by_market",
      "freshness_status": "pending_ingestion",
      "risk_notes": ["taxonomy can change", "quality varies by market"]
    }'::jsonb,
    'draft'
  ),
  (
    'openstreetmap',
    'network_and_pois',
    'OpenStreetMap — network, access and contextual POIs',
    NULL,
    'pending-extract',
    NULL,
    NULL,
    'extract_snapshot',
    'Open Database License (ODbL)',
    'https://www.openstreetmap.org/copyright',
    FALSE,
    'ODbL attribution/share-alike obligations require final product/legal review.',
    '{
      "supports_network_context": true,
      "supports_walk_drive_proxy": true,
      "supports_contextual_pois": true,
      "requires_attribution": true,
      "do_not_use_public_nominatim_for_bulk": true
    }'::jsonb,
    '{
      "coverage": "community_contributed_variable",
      "freshness_status": "pending_extract",
      "risk_notes": ["coverage varies", "license obligations must be reviewed"]
    }'::jsonb,
    'draft'
  ),
  (
    'geobooker',
    'businesses',
    'Geobooker — verified businesses and first-party categories',
    NULL,
    'internal-current',
    NULL,
    NULL,
    'continuous_internal',
    'Geobooker first-party data',
    'internal',
    TRUE,
    'Do not double-count records merged with external sources; preserve provenance.',
    '{
      "supports_verified_businesses": true,
      "supports_first_party_categories": true,
      "supports_quality_signals": true,
      "requires_provenance": true
    }'::jsonb,
    '{
      "coverage": "geobooker_platform",
      "freshness_status": "live_internal",
      "risk_notes": ["platform coverage bias", "deduplication required"]
    }'::jsonb,
    'draft'
  )
ON CONFLICT (source_key, dataset_key, dataset_version) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  country_code = EXCLUDED.country_code,
  source_date = EXCLUDED.source_date,
  refresh_frequency = EXCLUDED.refresh_frequency,
  license_name = EXCLUDED.license_name,
  license_reference = EXCLUDED.license_reference,
  commercial_use_allowed = EXCLUDED.commercial_use_allowed,
  redistribution_constraints = EXCLUDED.redistribution_constraints,
  capabilities = EXCLUDED.capabilities,
  quality_metadata = EXCLUDED.quality_metadata,
  status = CASE
    WHEN public.geo_source_registry.status = 'active' THEN public.geo_source_registry.status
    ELSE EXCLUDED.status
  END,
  updated_at = now();

INSERT INTO public.location_score_profiles (
  business_type_key,
  country_code,
  model_version,
  weights,
  normalization_config,
  minimum_confidence,
  is_active,
  valid_from,
  valid_to,
  approved_by,
  approved_at
)
VALUES
  (
    'cafe',
    'MX',
    'mx-cafe-v1-draft',
    '{
      "demand_potential": 25,
      "competition": 20,
      "complementarity": 15,
      "accessibility": 15,
      "commercial_centrality": 15,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "moderate_is_positive_excess_is_negative",
      "primary_radius_meters": 1000,
      "secondary_radius_meters": 2000,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_sales_forecast", "requires_field_validation"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'restaurant',
    'MX',
    'mx-restaurant-v1-draft',
    '{
      "demand_potential": 24,
      "competition": 18,
      "complementarity": 16,
      "accessibility": 15,
      "commercial_centrality": 17,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "category_specific_saturation_penalty",
      "primary_radius_meters": 1200,
      "secondary_radius_meters": 2500,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_sales_forecast", "requires_field_validation"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'gym',
    'MX',
    'mx-gym-v1-draft',
    '{
      "demand_potential": 24,
      "competition": 22,
      "complementarity": 12,
      "accessibility": 17,
      "commercial_centrality": 15,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "larger_trade_area_with_saturation_penalty",
      "primary_radius_meters": 2000,
      "secondary_radius_meters": 4000,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_sales_forecast", "requires_field_validation"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'pharmacy',
    'MX',
    'mx-pharmacy-v1-draft',
    '{
      "demand_potential": 26,
      "competition": 20,
      "complementarity": 16,
      "accessibility": 14,
      "commercial_centrality": 14,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "service_coverage_gap_and_saturation",
      "primary_radius_meters": 1000,
      "secondary_radius_meters": 2500,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_health_advice", "requires_regulatory_review"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'car_wash',
    'MX',
    'mx-car-wash-v1-draft',
    '{
      "demand_potential": 20,
      "competition": 20,
      "complementarity": 15,
      "accessibility": 25,
      "commercial_centrality": 10,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "vehicle_accessibility_weighted",
      "primary_radius_meters": 1800,
      "secondary_radius_meters": 3500,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_sales_forecast", "traffic_proxy_not_pedestrian_flow"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'local_retail',
    'MX',
    'mx-local-retail-v1-draft',
    '{
      "demand_potential": 23,
      "competition": 18,
      "complementarity": 17,
      "accessibility": 15,
      "commercial_centrality": 17,
      "data_quality": 10
    }'::jsonb,
    '{
      "competition_curve": "category_specific",
      "primary_radius_meters": 1000,
      "secondary_radius_meters": 2500,
      "classification_thresholds": {"unfavorable": 39, "limited": 59, "promising": 79, "strong": 100},
      "warnings": ["not_sales_forecast", "requires_category_mapping"]
    }'::jsonb,
    60,
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (business_type_key, country_code, model_version) DO UPDATE SET
  weights = EXCLUDED.weights,
  normalization_config = EXCLUDED.normalization_config,
  minimum_confidence = EXCLUDED.minimum_confidence,
  is_active = FALSE,
  valid_from = NULL,
  valid_to = NULL,
  approved_by = NULL,
  approved_at = NULL,
  updated_at = now();

UPDATE public.location_intelligence_feature_flags
SET
  enabled = FALSE,
  kill_switch = TRUE,
  change_reason = 'GEOSCORE_PHASE2 seeds loaded; runtime remains disabled pending engine, data QA and commercial approval',
  updated_at = now()
WHERE feature_key IN (
  'LOCATION_INTELLIGENCE_ENABLED',
  'LOCATION_INTELLIGENCE_MX_ENABLED',
  'LOCATION_INTELLIGENCE_COMPARISON_ENABLED',
  'LOCATION_INTELLIGENCE_PDF_ENABLED',
  'LOCATION_INTELLIGENCE_SHARE_ENABLED',
  'LOCATION_INTELLIGENCE_FIRST_PARTY_SIGNALS_ENABLED',
  'LOCATION_INTELLIGENCE_TRAFFIC_ENABLED'
);

NOTIFY pgrst, 'reload schema';

COMMIT;
