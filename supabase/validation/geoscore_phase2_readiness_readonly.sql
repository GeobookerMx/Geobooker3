-- GeoScore Phase 2 readiness validation (READ ONLY).
-- Expected after applying:
--   20260921010000_GEOSCORE_PHASE2_foundation_v1.sql
--   20260922130000_geoscore_phase2_seed_sources_profiles.sql

WITH objects AS (
  SELECT
    to_regclass('public.location_analyses') IS NOT NULL AS location_analyses_exists,
    to_regclass('public.location_intelligence_feature_flags') IS NOT NULL AS feature_flags_exists,
    to_regclass('public.geo_source_registry') IS NOT NULL AS source_registry_exists,
    to_regclass('public.location_score_profiles') IS NOT NULL AS score_profiles_exists,
    to_regclass('public.location_analysis_metrics') IS NOT NULL AS analysis_metrics_exists,
    to_regclass('public.location_analysis_sources') IS NOT NULL AS analysis_sources_exists
),
flags AS (
  SELECT
    count(*) FILTER (
      WHERE feature_key LIKE 'LOCATION_INTELLIGENCE_%'
    ) AS flag_count,
    bool_and(enabled = false AND kill_switch = true) FILTER (
      WHERE feature_key LIKE 'LOCATION_INTELLIGENCE_%'
    ) AS all_flags_fail_closed
  FROM public.location_intelligence_feature_flags
),
sources AS (
  SELECT
    count(*) AS source_count,
    count(*) FILTER (WHERE status IN ('draft', 'approved', 'active', 'paused', 'retired')) AS valid_status_sources,
    count(*) FILTER (WHERE source_key = 'inegi' AND dataset_key = 'denue') AS denue_sources,
    count(*) FILTER (WHERE source_key = 'geobooker' AND dataset_key = 'businesses') AS geobooker_sources
  FROM public.geo_source_registry
),
profiles AS (
  SELECT
    count(*) AS profile_count,
    count(*) FILTER (WHERE country_code = 'MX') AS mx_profile_count,
    count(*) FILTER (WHERE is_active = true) AS active_profile_count,
    count(*) FILTER (
      WHERE weights ?& ARRAY[
        'demand_potential',
        'competition',
        'complementarity',
        'accessibility',
        'commercial_centrality',
        'data_quality'
      ]
    ) AS profiles_with_required_weights
  FROM public.location_score_profiles
),
privileges AS (
  SELECT
    has_table_privilege('anon', 'public.location_analyses', 'SELECT') AS anon_can_read_analyses,
    has_table_privilege('authenticated', 'public.location_analyses', 'SELECT') AS authenticated_can_read_analyses,
    has_table_privilege('authenticated', 'public.location_analyses', 'INSERT') AS authenticated_can_insert_analyses,
    has_table_privilege('authenticated', 'public.location_analyses', 'UPDATE') AS authenticated_can_update_analyses,
    has_table_privilege('authenticated', 'public.location_analyses', 'DELETE') AS authenticated_can_delete_analyses,
    has_table_privilege('service_role', 'public.location_analyses', 'INSERT') AS service_role_can_insert_analyses,
    has_table_privilege('anon', 'public.geo_source_registry', 'SELECT') AS anon_can_read_sources,
    has_table_privilege('authenticated', 'public.geo_source_registry', 'SELECT') AS authenticated_can_read_sources
)
SELECT
  objects.location_analyses_exists,
  objects.feature_flags_exists,
  objects.source_registry_exists,
  objects.score_profiles_exists,
  objects.analysis_metrics_exists,
  objects.analysis_sources_exists,
  flags.flag_count,
  COALESCE(flags.all_flags_fail_closed, false) AS all_flags_fail_closed,
  sources.source_count,
  sources.denue_sources,
  sources.geobooker_sources,
  profiles.profile_count,
  profiles.mx_profile_count,
  profiles.active_profile_count,
  profiles.profiles_with_required_weights,
  privileges.anon_can_read_analyses,
  privileges.authenticated_can_read_analyses,
  privileges.authenticated_can_insert_analyses,
  privileges.authenticated_can_update_analyses,
  privileges.authenticated_can_delete_analyses,
  privileges.service_role_can_insert_analyses,
  privileges.anon_can_read_sources,
  privileges.authenticated_can_read_sources,
  (
    objects.location_analyses_exists
    AND objects.feature_flags_exists
    AND objects.source_registry_exists
    AND objects.score_profiles_exists
    AND objects.analysis_metrics_exists
    AND objects.analysis_sources_exists
    AND COALESCE(flags.flag_count, 0) >= 7
    AND COALESCE(flags.all_flags_fail_closed, false)
    AND sources.source_count >= 6
    AND sources.denue_sources >= 1
    AND sources.geobooker_sources >= 1
    AND profiles.profile_count >= 6
    AND profiles.mx_profile_count >= 6
    AND profiles.active_profile_count = 0
    AND profiles.profiles_with_required_weights = profiles.profile_count
    AND privileges.anon_can_read_analyses = false
    AND privileges.authenticated_can_insert_analyses = false
    AND privileges.authenticated_can_update_analyses = false
    AND privileges.authenticated_can_delete_analyses = false
    AND privileges.service_role_can_insert_analyses = true
  ) AS geoscore_phase2_ready_fail_closed
FROM objects, flags, sources, profiles, privileges;
