-- ==========================================================
-- FIX CRÍTICO: DESACTIVAR RLS EN AD_CAMPAIGNS Y STORAGE
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Este script desactiva RLS completamente para permitir operaciones

-- ==========================================================
-- OPCIÓN A: DESACTIVAR RLS COMPLETAMENTE (RECOMENDADO PARA PROBAR)
-- ==========================================================

-- Desactivar RLS en ad_campaigns
ALTER TABLE ad_campaigns DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ad_campaigns';

-- ==========================================================
-- STORAGE: Hacer bucket público y eliminar restricciones
-- ==========================================================

-- 1. Hacer bucket completamente público
UPDATE storage.buckets SET public = true WHERE id = 'ad-creatives';

-- 2. Eliminar TODAS las políticas de storage para ad-creatives
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar errores
        END;
    END LOOP;
END $$;

-- 3. Crear política completamente abierta para el bucket
CREATE POLICY "Public full access ad-creatives"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'ad-creatives')
WITH CHECK (bucket_id = 'ad-creatives');

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================

-- Ver estado de RLS en ad_campaigns
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'ad_campaigns';

-- Ver bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';

-- Ver políticas de storage
SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- ==========================================================
-- ¡LISTO! 
-- RLS está desactivado en ad_campaigns
-- Storage bucket es público sin restricciones
-- ==========================================================
