-- ============================================================================
-- Geobooker - Fix Supabase Advisor "RLS Disabled in Public"
-- Fecha: 2026-07-14
--
-- Corrige tablas public expuestas por PostgREST que no tenian RLS habilitado.
-- Diseno:
-- - business_quality_scores: lectura publica, gestion admin
-- - business_awards: lectura publica controlada, gestion admin
-- - business_awards_import_staging: solo admin
-- - spatial_ref_sys: lectura publica con RLS activa
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- business_quality_scores
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.business_quality_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read business_quality_scores" ON public.business_quality_scores;
CREATE POLICY "Public read business_quality_scores"
ON public.business_quality_scores
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admin manage business_quality_scores" ON public.business_quality_scores;
CREATE POLICY "Admin manage business_quality_scores"
ON public.business_quality_scores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);

-- --------------------------------------------------------------------------
-- business_awards
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.business_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read visible business_awards" ON public.business_awards;
CREATE POLICY "Public read visible business_awards"
ON public.business_awards
FOR SELECT
TO anon, authenticated
USING (
  verification_status IN ('verified', 'pending')
);

DROP POLICY IF EXISTS "Admin manage business_awards" ON public.business_awards;
CREATE POLICY "Admin manage business_awards"
ON public.business_awards
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);

-- --------------------------------------------------------------------------
-- business_awards_import_staging
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.business_awards_import_staging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage business_awards_import_staging" ON public.business_awards_import_staging;
CREATE POLICY "Admin manage business_awards_import_staging"
ON public.business_awards_import_staging
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);

-- --------------------------------------------------------------------------
-- spatial_ref_sys (PostGIS)
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Public read spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
TO anon, authenticated
USING (true);

COMMIT;

-- --------------------------------------------------------------------------
-- Validacion rapida sugerida despues de ejecutar
-- --------------------------------------------------------------------------
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'business_quality_scores',
--     'business_awards',
--     'business_awards_import_staging',
--     'spatial_ref_sys'
--   )
-- ORDER BY tablename;
