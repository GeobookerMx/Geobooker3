-- ========================================
-- CREAR BUCKET business-images PARA FOTOS DE NEGOCIOS
-- ========================================
-- Ejecuta esto en Supabase SQL Editor

-- Crear bucket (público para mostrar fotos de negocios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business images', 'business images', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CONFIGURAR POLÍTICAS RLS
-- ========================================

-- Limpiar políticas anteriores si existen
DROP POLICY IF EXISTS "Users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own business images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own business images" ON storage.objects;

-- Permitir a usuarios autenticados SUBIR imágenes
CREATE POLICY "Users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business images');

-- Permitir LEER imágenes públicamente (para mostrar en perfiles)
CREATE POLICY "Anyone can view business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business images');

-- Permitir a usuarios ACTUALIZAR sus imágenes
CREATE POLICY "Users can update own business images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business images');

-- Permitir a usuarios ELIMINAR sus imágenes  
CREATE POLICY "Users can delete own business images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business images');

-- ========================================
-- VERIFICAR
-- ========================================

-- Ver buckets creados
SELECT * FROM storage.buckets WHERE id = 'business images';

-- Ver políticas RLS
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%business%';

-- ========================================
-- LÍMITES POR PLAN
-- ========================================
-- Free: 1 foto (controlado en BusinessEditPage.jsx)
-- Premium: 10 fotos (controlado en BusinessEditPage.jsx)
-- Máximo por foto: 2MB
-- ========================================
