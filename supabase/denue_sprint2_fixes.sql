-- =====================================================
-- FIX SUPABASE 404/PGRST202 "Schema Cache" y PERMISOS (RLS)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Dar permiso público de lectura a los negocios de DENUE
-- Para que cualquier visitante anónimo (o logueado) pueda verlos en el mapa
DROP POLICY IF EXISTS "Public can view pending candidates" ON business_candidates;
CREATE POLICY "Public can view pending candidates"
  ON business_candidates FOR SELECT
  USING (moderation_status = 'pending');

-- 2. Asegurar que negocios públicos también tienen vista libre
DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;
CREATE POLICY "Public can view active businesses"
  ON businesses FOR SELECT
  USING (status = 'approved');

-- 3. Forzar a Supabase a recargar su caché interno de funciones (PostgREST schema cache)
-- Esto arregla el error "Could not find the function... in the schema cache" (PGRST202)
NOTIFY pgrst, 'reload schema';
