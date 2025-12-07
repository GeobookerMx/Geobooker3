-- ✅ Ya creaste el bucket manualmente
-- Ahora ejecuta SOLO las políticas RLS:

-- Limpiar políticas anteriores si existen
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

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

-- Verificar
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%ad%';
