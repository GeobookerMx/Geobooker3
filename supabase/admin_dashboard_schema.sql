-- Script SQL para crear las tablas del Dashboard de Administrador y Geobooker Ads
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- 1. TABLA: admin_users (Usuarios administradores)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- =====================================================
-- 2. TABLA: ad_spaces (Espacios publicitarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('1ra_plana', '2da_plana', 'interstitial')),
  position TEXT NOT NULL CHECK (position IN ('top', 'middle', 'bottom', 'fullscreen')),
  size_desktop TEXT NOT NULL, -- Ejemplo: '728x90'
  size_mobile TEXT NOT NULL,  -- Ejemplo: '320x100'
  price_monthly DECIMAL(10,2) NOT NULL,
  max_slots INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ad_spaces
CREATE INDEX IF NOT EXISTS idx_ad_spaces_type ON ad_spaces(type);
CREATE INDEX IF NOT EXISTS idx_ad_spaces_is_active ON ad_spaces(is_active);

-- =====================================================
-- 3. TABLA: ad_campaigns (Campañas publicitarias)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_space_id UUID NOT NULL REFERENCES ad_spaces(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL,
  advertiser_email TEXT NOT NULL,
  advertiser_phone TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  geographic_scope TEXT NOT NULL CHECK (geographic_scope IN ('global', 'country', 'region', 'city')),
  target_location TEXT, -- 'Mexico', 'USA', 'Spain', etc.
  target_category TEXT, -- 'pharmacy', 'restaurant', null (todas)
  budget DECIMAL(10,2) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0, -- Click-Through Rate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Índices para ad_campaigns
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_ad_space ON ad_campaigns(ad_space_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_location ON ad_campaigns(target_location);

-- =====================================================
-- 4. TABLA: ad_creatives (Contenido de anuncios)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT NOT NULL, -- "Ver más", "Llamar ahora", etc.
  cta_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ad_creatives
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_is_active ON ad_creatives(is_active);

-- =====================================================
-- 5. TABLA: ad_analytics (Métricas de anuncios)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Índices para ad_analytics
CREATE INDEX IF NOT EXISTS idx_ad_analytics_campaign ON ad_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_date ON ad_analytics(date);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users
CREATE POLICY "Admin users can view all admin users"
  ON admin_users FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Only super admins can insert admin users"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin')
  );

-- Políticas para ad_spaces
CREATE POLICY "Admins can view ad spaces"
  ON ad_spaces FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can manage ad spaces"
  ON ad_spaces FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Políticas para ad_campaigns
CREATE POLICY "Admins can view campaigns"
  ON ad_campaigns FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can manage campaigns"
  ON ad_campaigns FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Políticas para ad_creatives
CREATE POLICY "Admins can view creatives"
  ON ad_creatives FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can manage creatives"
  ON ad_creatives FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Políticas para ad_analytics
CREATE POLICY "Admins can view analytics"
  ON ad_analytics FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can manage analytics"
  ON ad_analytics FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- =====================================================
-- 7. DATOS INICIALES: Espacios Publicitarios
-- =====================================================

INSERT INTO ad_spaces (name, display_name, type, position, size_desktop, size_mobile, price_monthly, max_slots, description) VALUES
  ('hero_banner', 'Hero Banner', '1ra_plana', 'top', '728x90', '320x100', 1500.00, 3, 'Banner principal debajo de la barra de búsqueda'),
  ('featured_carousel', 'Carrusel Destacados', '1ra_plana', 'top', '280x200', '280x200', 300.00, 10, 'Carrusel de negocios destacados antes de resultados'),
  ('sponsored_results', 'Resultados Patrocinados', '1ra_plana', 'middle', 'list', 'list', 1.50, 3, 'Primeros resultados en búsqueda (precio por click)'),
  ('bottom_banner', 'Banner Inferior', '2da_plana', 'bottom', '728x90', '320x50', 500.00, 2, 'Banner sticky en parte inferior del mapa'),
  ('recommended_section', 'Recomendados para Ti', '2da_plana', 'middle', '250x300', '250x300', 250.00, 4, 'Sección de negocios recomendados debajo del mapa'),
  ('interstitial', 'Interstitial', 'interstitial', 'fullscreen', '800x600', '100%', 3000.00, 1, 'Anuncio de pantalla completa (ocasional)')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_spaces_updated_at BEFORE UPDATE ON ad_spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_creatives_updated_at BEFORE UPDATE ON ad_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. COMENTARIOS
-- =====================================================

COMMENT ON TABLE admin_users IS 'Usuarios con permisos de administrador';
COMMENT ON TABLE ad_spaces IS 'Espacios publicitarios disponibles en la plataforma';
COMMENT ON TABLE ad_campaigns IS 'Campañas publicitarias activas y pasadas';
COMMENT ON TABLE ad_creatives IS 'Contenido visual y textual de los anuncios';
COMMENT ON TABLE ad_analytics IS 'Métricas diarias de rendimiento de campañas';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- NOTA: Para crear tu primer usuario administrador, ejecuta:
-- INSERT INTO admin_users (id, email, role) VALUES 
--   ('TU_USER_ID_DE_SUPABASE_AUTH', 'admin@geobooker.com', 'super_admin');
