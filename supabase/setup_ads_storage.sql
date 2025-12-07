-- ==========================================================
-- SETUP STORAGE PARA GEOBOOKER ADS
-- ==========================================================

-- 1. Crear el bucket 'ad-creatives' (si no existe, se crea desde dashboard, pero aquí aseguramos policies)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en objetos de storage (por si acaso)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Cualquiera puede VER los anuncios (Público)
CREATE POLICY "Public Read Ad Creatives"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ad-creatives' );

-- 4. Policy: Usuarios autenticados pueden SUBIR creativos (Para el Wizard)
-- Limitamos a usuarios logueados para evitar spam anónimo
CREATE POLICY "Auth Users Upload Ad Creatives"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-creatives' 
  AND auth.role() = 'authenticated'
);

-- 5. Policy: Usuarios pueden actualizar/borrar SUS PROPIOS creativos
-- Usamos la convención de guardar en carpeta user_id/filename
CREATE POLICY "Users Manage Own Ad Creatives"
ON storage.objects FOR ALL
USING (
  bucket_id = 'ad-creatives' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
