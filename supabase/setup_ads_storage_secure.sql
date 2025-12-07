-- ==========================================================
-- SETUP STORAGE PARA GEOBOOKER ADS (VERSION SEGURA)
-- ==========================================================

-- 1. Crear el bucket 'ad-creatives'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Lectura Pública (Cualquiera ve los anuncios)
DROP POLICY IF EXISTS "Public Read Ad Creatives" ON storage.objects;
CREATE POLICY "Public Read Ad Creatives"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ad-creatives' );

-- 4. Policy: Upload Seguro (Limitado a carpeta del usuario)
-- CORRECCIÓN DE SEGURIDAD: Se obliga a que la ruta empiece con el UID del usuario
DROP POLICY IF EXISTS "Auth Users Upload Ad Creatives" ON storage.objects;
CREATE POLICY "Auth Users Upload Ad Creatives"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-creatives' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text -- 🔒 CANDADO DE SEGURIDAD
);

-- 5. Policy: Gestión de propios archivos
DROP POLICY IF EXISTS "Users Manage Own Ad Creatives" ON storage.objects;
CREATE POLICY "Users Manage Own Ad Creatives"
ON storage.objects FOR ALL
USING (
  bucket_id = 'ad-creatives' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
