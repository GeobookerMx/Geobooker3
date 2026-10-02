-- GeoScore Phase 2 hardening: browser users may read their own analyses
-- through RLS, but all writes stay backend-only via service_role.

REVOKE ALL ON TABLE
  public.location_intelligence_feature_flags,
  public.geo_source_registry,
  public.location_score_profiles,
  public.location_analyses,
  public.location_analysis_metrics,
  public.location_analysis_sources
FROM PUBLIC, anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.location_analyses,
  public.location_analysis_metrics,
  public.location_analysis_sources
FROM authenticated;

REVOKE ALL ON TABLE
  public.location_intelligence_feature_flags,
  public.geo_source_registry,
  public.location_score_profiles
FROM authenticated;

GRANT SELECT ON public.location_analyses TO authenticated;
GRANT SELECT ON public.location_analysis_metrics TO authenticated;
GRANT SELECT ON public.location_analysis_sources TO authenticated;

GRANT ALL ON TABLE
  public.location_intelligence_feature_flags,
  public.geo_source_registry,
  public.location_score_profiles,
  public.location_analyses,
  public.location_analysis_metrics,
  public.location_analysis_sources
TO service_role;

DROP POLICY IF EXISTS location_analyses_owner_insert_v1
  ON public.location_analyses;
DROP POLICY IF EXISTS location_analyses_owner_update_v1
  ON public.location_analyses;
DROP POLICY IF EXISTS location_analyses_owner_delete_v1
  ON public.location_analyses;

COMMENT ON TABLE public.location_analyses IS
  'Immutable-version GeoScore analysis envelope. Browser clients may SELECT own rows only; INSERT/UPDATE/DELETE are backend-only.';
