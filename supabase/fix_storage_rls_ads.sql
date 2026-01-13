-- ==========================================================
-- FIX: POLÍTICAS DE STORAGE PARA AD-CREATIVES
-- ==========================================================
-- Ejecutar en Supabase SQL Editor
-- Este script permite uploads tanto en carpeta del usuario como en /enterprise/

-- 1. Primero eliminamos las políticas anteriores
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Upload Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users Manage Own Ad Creatives" ON storage.objects;
DROP POLICY IF EXISTS "Enterprise folder upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload ad creatives" ON storage.objects;

-- 2. Política de LECTURA pública (para mostrar los anuncios)
CREATE POLICY "Public Read Ad Creatives"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

-- 3. Política de UPLOAD para usuarios autenticados
-- Permite subir a:
--   - Carpeta del usuario: user_id/filename.ext
--   - Carpeta enterprise: enterprise/filename.ext  
--   - Carpeta ads: ads/filename.ext
CREATE POLICY "Authenticated users upload ad creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ad-creatives' 
    AND (
        -- Carpeta del usuario
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Carpeta enterprise (para checkout enterprise)
        (storage.foldername(name))[1] = 'enterprise'
        OR
        -- Carpeta ads genérica
        (storage.foldername(name))[1] = 'ads'
    )
);

-- 4. Política de UPDATE para archivos propios o enterprise
CREATE POLICY "Users update own ad creatives"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'ad-creatives'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] = 'enterprise'
        OR (storage.foldername(name))[1] = 'ads'
    )
);

-- 5. Política de DELETE para archivos propios
CREATE POLICY "Users delete own ad creatives"  
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ad-creatives'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] = 'enterprise'
    )
);

-- ==========================================================
-- VERIFICACIÓN
-- ==========================================================
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%ad%' OR policyname LIKE '%creatives%';

-- Verificar que el bucket existe y es público
SELECT id, name, public FROM storage.buckets WHERE id = 'ad-creatives';

-- ==========================================================
-- NOTA IMPORTANTE
-- ==========================================================
-- Si el bucket NO es público, hay que hacerlo público para que
-- las URLs de los creativos sean accesibles:
-- 
-- UPDATE storage.buckets SET public = true WHERE id = 'ad-creatives';
-- ==========================================================
