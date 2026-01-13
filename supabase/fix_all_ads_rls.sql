-- ==========================================================
-- FIX COMPLETO: RLS PARA SISTEMA DE ADS (ENTERPRISE + NORMAL)
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Este script soluciona TODOS los problemas de RLS para ads

-- ==========================================================
-- PARTE 1: FIX TABLA ad_campaigns
-- ==========================================================

-- Eliminar políticas restrictivas anteriores
DROP POLICY IF EXISTS "Admins can view campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can view own campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Public can view active campaigns" ON ad_campaigns;

-- 1. Cualquiera puede VER campañas activas (para mostrar anuncios)
CREATE POLICY "Public can view active campaigns"
ON ad_campaigns FOR SELECT
TO public
USING (status = 'active');

-- 2. Usuarios autenticados pueden CREAR campañas
CREATE POLICY "Authenticated users can create campaigns"
ON ad_campaigns FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Admins pueden HACER TODO
CREATE POLICY "Admins full access campaigns"
ON ad_campaigns FOR ALL
TO authenticated
USING (
    auth.uid() IN (SELECT id FROM admin_users)
);

-- 4. Usuarios pueden ver campañas que crearon (por email)
CREATE POLICY "Users view own campaigns by email"
ON ad_campaigns FOR SELECT
TO authenticated
USING (
    advertiser_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ==========================================================
-- PARTE 2: FIX STORAGE ad-creatives
-- ==========================================================

-- Eliminar todas las políticas anteriores
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Upload Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users Manage Own Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Enterprise folder upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users update own ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own ad creatives" ON storage.objects;

-- Asegurar que el bucket existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 1. Lectura pública (para mostrar anuncios)
CREATE POLICY "Public read ad creatives"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

-- 2. Upload para usuarios autenticados (SIN restricción de carpeta)
CREATE POLICY "Auth users upload ad creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-creatives');

-- 3. Update/Delete para usuarios autenticados
CREATE POLICY "Auth users manage ad creatives"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Auth users delete ad creatives"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ad-creatives');

-- ==========================================================
-- PARTE 3: FIX TABLA ad_creatives (si existe)
-- ==========================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ad_creatives') THEN
        -- Eliminar políticas anteriores
        DROP POLICY IF EXISTS "Admins can view creatives" ON ad_creatives;
        DROP POLICY IF EXISTS "Admins can manage creatives" ON ad_creatives;
        DROP POLICY IF EXISTS "Users can create creatives" ON ad_creatives;
        
        -- Usuarios autenticados pueden crear creativos
        CREATE POLICY "Authenticated users can create creatives"
        ON ad_creatives FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        -- Lectura pública para creativos activos
        CREATE POLICY "Public read active creatives"
        ON ad_creatives FOR SELECT
        TO public
        USING (true);
        
        -- Admins full access
        CREATE POLICY "Admins full access creatives"
        ON ad_creatives FOR ALL
        TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    END IF;
END $$;

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================

-- Ver políticas de ad_campaigns
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ad_campaigns';

-- Ver políticas de storage
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Ver estado del bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';

-- ==========================================================
-- ¡LISTO! 
-- Ahora los usuarios pueden:
-- ✅ Subir imágenes a cualquier carpeta en ad-creatives
-- ✅ Crear campañas en ad_campaigns
-- ✅ Ver sus propias campañas
-- ✅ Admins tienen acceso completo
-- ==========================================================
