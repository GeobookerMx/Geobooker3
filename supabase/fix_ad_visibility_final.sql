-- ==========================================================
-- FIX: Public visibility for Ad Spaces, Campaigns and Creatives
-- Permite que los anuncios sean visibles para todos los usuarios
-- ==========================================================

-- 1. Asegurar que las tablas tengan RLS habilitado
ALTER TABLE ad_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Public Read Ad Spaces" ON ad_spaces;
DROP POLICY IF EXISTS "Public Read Active Campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Public Read Active Creatives" ON ad_creatives;
DROP POLICY IF EXISTS "Admins can manage spaces" ON ad_spaces;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins can manage creatives" ON ad_creatives;

-- 3. Crear políticas de lectura pública
-- Cualquiera puede ver los nombres y tipos de espacios disponibles
CREATE POLICY "Public Read Ad Spaces" ON ad_spaces 
FOR SELECT USING (is_active = true);

-- Cualquiera puede ver campañas activas
CREATE POLICY "Public Read Active Campaigns" ON ad_campaigns 
FOR SELECT USING (status = 'active');

-- Cualquiera puede ver creativos activos
CREATE POLICY "Public Read Active Creatives" ON ad_creatives 
FOR SELECT USING (is_active = true);

-- 4. Asegurar que los administradores mantengan control total
-- Nota: Asumimos que existe una tabla admin_users
CREATE POLICY "Admins manage spaces" ON ad_spaces 
FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins manage campaigns" ON ad_campaigns 
FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins manage creatives" ON ad_creatives 
FOR ALL USING (auth.uid() IN (SELECT id FROM admin_users));

-- 5. Otorgar permisos de SELECT al rol 'anon' (usuarios no logueados)
GRANT SELECT ON ad_spaces TO anon;
GRANT SELECT ON ad_campaigns TO anon;
GRANT SELECT ON ad_creatives TO anon;

-- 6. Otorgar permisos al rol 'authenticated' (usuarios logueados)
GRANT SELECT ON ad_spaces TO authenticated;
GRANT SELECT ON ad_campaigns TO authenticated;
GRANT SELECT ON ad_creatives TO authenticated;

-- 7. Verificar que el RPC get_targeted_ads tenga permisos de ejecución
-- Especificamos la firma completa (5 parámetros) para evitar el error de ambigüedad
GRANT EXECUTE ON FUNCTION get_targeted_ads(text, text, text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_targeted_ads(text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_targeted_ads(text, text, text, text, integer) TO service_role;

-- 8. Asegurar datos iniciales mínimos si la tabla está vacía
INSERT INTO ad_spaces (name, display_name, type, position, size_desktop, size_mobile, price_monthly, max_slots, is_active)
VALUES 
  ('hero_banner', 'Hero Banner', '1ra_plana', 'top', '728x90', '320x100', 1500, 3, true),
  ('featured_carousel', 'Carrusel Destacados', '1ra_plana', 'top', '280x200', '280x200', 300, 10, true),
  ('sponsored_results', 'Resultados Patrocinados', '1ra_plana', 'middle', 'list', 'list', 1.5, 3, true)
ON CONFLICT (name) DO UPDATE SET is_active = true;
