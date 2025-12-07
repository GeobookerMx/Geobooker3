-- ========================================
-- CREAR BUCKET ad-creatives PARA IMÁGENES
-- ========================================
-- Ejecuta esto en Supabase SQL Editor

-- OPCIÓN A: Crear bucket con Storage UI (RECOMENDADO)
-- 1. Ve a Storage en Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Nombre: ad-creatives
-- 4. Public bucket: NO (dejar privado)
-- 5. Click "Create bucket"

-- OPCIÓN B: Crear con SQL (si prefieres)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', false)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- CONFIGURAR POLÍTICAS RLS
-- ========================================

-- Permitir a usuarios autenticados SUBIR imágenes en su carpeta
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ad-creatives' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir LEER imágenes públicamente (para mostrar anuncios)
CREATE POLICY "Anyone can view ad creatives"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

-- Permitir a usuarios ACTUALIZAR sus propias imágenes
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ad-creatives' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir a usuarios ELIMINAR sus propias imágenes  
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ad-creatives' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- VERIFICAR
-- ========================================

-- Ver buckets creados
SELECT * FROM storage.buckets WHERE id = 'ad-creatives';

-- Ver políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%ad%';

-- ========================================
--  LISTO!
-- ========================================
-- El bucket ahora acepta uploads de usuarios logueados
-- Ruta: user_id/filename.ext
-- ========================================
