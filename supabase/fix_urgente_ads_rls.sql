-- ==========================================================
-- FIX URGENTE: DESHABILITAR RLS RESTRICTIVO PARA ADS
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Este script es más agresivo para garantizar que funcione

-- ==========================================================
-- PASO 1: VERIFICAR TODAS LAS POLÍTICAS ACTUALES
-- ==========================================================
-- Primero veamos qué políticas existen
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ad_campaigns';

-- ==========================================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS DE ad_campaigns
-- ==========================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'ad_campaigns'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON ad_campaigns', pol.policyname);
    END LOOP;
END $$;

-- ==========================================================
-- PASO 3: CREAR POLÍTICA COMPLETAMENTE PERMISIVA
-- ==========================================================
-- Permitir TODO a usuarios autenticados
CREATE POLICY "Allow all for authenticated users"
ON ad_campaigns
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- También permitir lectura pública para mostrar anuncios
CREATE POLICY "Allow public read active"
ON ad_campaigns
FOR SELECT
TO public
USING (status = 'active');

-- ==========================================================
-- PASO 4: FIX STORAGE - ELIMINAR TODAS LAS POLÍTICAS
-- ==========================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies 
               WHERE schemaname = 'storage' AND tablename = 'objects'
               AND policyname LIKE '%ad%' OR policyname LIKE '%creative%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Asegurar bucket público
UPDATE storage.buckets SET public = true WHERE id = 'ad-creatives';

-- Política permisiva para storage
CREATE POLICY "Allow all authenticated storage"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'ad-creatives')
WITH CHECK (bucket_id = 'ad-creatives');

CREATE POLICY "Allow public read storage"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

-- ==========================================================
-- PASO 5: VERIFICAR QUE TODO ESTÉ BIEN
-- ==========================================================
SELECT 'ad_campaigns policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ad_campaigns';

SELECT 'storage policies for ad-creatives:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

SELECT 'bucket status:' as info;
SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';

-- ==========================================================
-- ✅ LISTO - Ahora debería funcionar
-- ==========================================================
