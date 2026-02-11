-- =====================================================
-- SQL: Mejoras Flujo Publicitario + Setup Bucket Recommendations
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-02-11
-- =====================================================

-- =============================================
-- PARTE 1: BUCKET 'recommendations' para fotos
-- =============================================

-- 1A. Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('recommendations', 'recommendations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 1B. Eliminar políticas anteriores (limpieza)
DROP POLICY IF EXISTS "Public read recommendations" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload recommendations" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete own recommendations" ON storage.objects;

-- 1C. Política: Cualquiera puede ver fotos de recomendaciones
CREATE POLICY "Public read recommendations"
ON storage.objects FOR SELECT
USING (bucket_id = 'recommendations');

-- 1D. Política: Usuarios autenticados pueden subir fotos
CREATE POLICY "Auth users upload recommendations"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'recommendations' 
    AND auth.role() = 'authenticated'
);

-- 1E. Política: Usuarios pueden eliminar sus propias fotos
CREATE POLICY "Auth users delete own recommendations"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'recommendations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- PARTE 2: Columna rejection_reason en ad_campaigns
-- =============================================

-- 2A. Agregar columna para razón de rechazo
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2B. Comentario documenta la columna
COMMENT ON COLUMN ad_campaigns.rejection_reason IS 
'Razón del rechazo de la campaña. Opciones: imagen_inapropiada, url_no_funciona, contenido_engañoso, otra';

-- =============================================
-- PARTE 3: Hacer latitude/longitude NULLABLE en user_recommendations
-- (para eliminar el fallback falso a CDMX)
-- =============================================

-- 3A. Permitir NULL en latitud y longitud
ALTER TABLE user_recommendations 
ALTER COLUMN latitude DROP NOT NULL;

ALTER TABLE user_recommendations 
ALTER COLUMN longitude DROP NOT NULL;

-- 3B. Limpiar datos falsos (recomendaciones con ubicación por defecto de CDMX)
-- Esto pone NULL en registros que tienen exactamente las coords de fallback
UPDATE user_recommendations
SET latitude = NULL, longitude = NULL
WHERE latitude = 19.4326 AND longitude = -99.1332;

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Verificar bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'recommendations';

-- Verificar columna rejection_reason
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ad_campaigns' AND column_name = 'rejection_reason';

-- Verificar lat/lng ahora son nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_recommendations' AND column_name IN ('latitude', 'longitude');

-- Verificar políticas de storage
SELECT policyname, tablename 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%recommendations%';
