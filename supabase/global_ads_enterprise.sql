-- ==============================================================================
-- MIGRACIÓN: SISTEMA DE CAMPAÑAS GLOBALES Y ANUNCIANTES ENTERPRISE
-- ==============================================================================
-- Versión: 1.0
-- Fecha: Diciembre 2025
-- Descripción: Soporte para campañas internacionales (FIFA 2026, etc.)
-- ==============================================================================

-- 1. Nueva tabla: Anunciantes Globales/Enterprise
-- Almacena información de empresas internacionales como Heineken, Coca-Cola, etc.
CREATE TABLE IF NOT EXISTS global_advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información de la empresa
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  country TEXT NOT NULL,
  company_website TEXT,
  company_logo_url TEXT,
  tax_id TEXT, -- RFC en México, EIN en USA, VAT en Europa
  
  -- Clasificación
  company_type TEXT DEFAULT 'enterprise', -- 'enterprise', 'agency', 'regional'
  industry TEXT, -- 'beverages', 'automotive', 'tech', 'fashion', etc.
  
  -- Facturación
  billing_currency TEXT DEFAULT 'USD', -- USD, EUR, MXN
  billing_email TEXT,
  stripe_customer_id TEXT,
  
  -- Gestión interna
  account_manager TEXT, -- Email del account manager de Geobooker
  contract_signed_at TIMESTAMP,
  contract_document_url TEXT,
  notes TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'active', 'suspended'
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE global_advertisers ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver anunciantes globales
CREATE POLICY "Admin access global advertisers" ON global_advertisers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );


-- 2. Actualizar tabla ad_campaigns con campos para campañas globales
-- Estos campos extienden la funcionalidad existente

-- Tipo de campaña
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'local';
-- 'local': Negocio pequeño, 1 ciudad
-- 'regional': Cadena regional, varias ciudades
-- 'national': Todo un país
-- 'global': Multi-país, enterprise

-- Referencia a anunciante global (opcional, solo para enterprise)
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS global_advertiser_id UUID REFERENCES global_advertisers(id);

-- Segmentación geográfica avanzada
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_cities JSONB DEFAULT '[]'::jsonb;
-- Ejemplo: ["Los Angeles", "New York", "Miami", "Dallas"]

ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_countries JSONB DEFAULT '[]'::jsonb;
-- Ejemplo: ["US", "MX", "CA"]

-- Eventos especiales
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS target_events JSONB DEFAULT '[]'::jsonb;
-- Ejemplo: [{"name": "FIFA 2026", "start": "2026-06-01", "end": "2026-07-31"}]

-- Creativos multilingües
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS multi_language_creatives JSONB DEFAULT '{}'::jsonb;
-- Ejemplo: {"en": {"title": "...", "desc": "..."}, "es": {"title": "...", "desc": "..."}}

-- Modelo de facturación
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'flat';
-- 'flat': Precio fijo por período
-- 'cpm': Costo por mil impresiones
-- 'cpc': Costo por click

ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cpm_rate DECIMAL(6,2) DEFAULT NULL;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS cpc_rate DECIMAL(6,2) DEFAULT NULL;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS total_budget DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN';

-- Stripe checkout
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;


-- 3. Tabla de performance/analytics por campaña
CREATE TABLE IF NOT EXISTS campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  
  -- Período
  date DATE NOT NULL,
  
  -- Métricas
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  -- Segmentación
  city TEXT,
  country TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índice único para evitar duplicados
  UNIQUE(campaign_id, date, city, device_type)
);

-- RLS para analytics
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;

-- Anunciantes pueden ver sus propias métricas (via email del JWT)
CREATE POLICY "Advertisers view own performance" ON campaign_performance
  FOR SELECT USING (
    campaign_id IN (
      SELECT c.id FROM ad_campaigns c
      WHERE c.advertiser_email = auth.jwt()->>'email'
        OR c.global_advertiser_id IN (
          SELECT ga.id FROM global_advertisers ga WHERE ga.contact_email = auth.jwt()->>'email'
        )
    )
  );

-- Admins ven todo
CREATE POLICY "Admin full access performance" ON campaign_performance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );


-- 4. Tabla de Planes de Precios Enterprise (PROMOCIÓN LANZAMIENTO 50% OFF)
CREATE TABLE IF NOT EXISTS enterprise_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code TEXT NOT NULL UNIQUE, -- 'city_pack', 'regional', 'national', 'global_event'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Precios NORMALES
  regular_price_usd DECIMAL(10,2) NOT NULL,
  regular_price_mxn DECIMAL(10,2) NOT NULL,
  regular_price_eur DECIMAL(10,2) NOT NULL,
  
  -- Precios PROMOCIÓN LANZAMIENTO (50% OFF)
  promo_price_usd DECIMAL(10,2) NOT NULL,
  promo_price_mxn DECIMAL(10,2) NOT NULL,
  promo_price_eur DECIMAL(10,2) NOT NULL,
  
  -- Configuración
  cities_included INTEGER DEFAULT 1,
  duration_months INTEGER DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Stripe Price IDs
  stripe_price_id_usd TEXT,
  stripe_price_id_mxn TEXT,
  stripe_price_id_eur TEXT,
  
  -- Control
  is_active BOOLEAN DEFAULT true,
  promo_active BOOLEAN DEFAULT true,
  promo_ends_at TIMESTAMP DEFAULT '2025-12-31 23:59:59'::timestamp,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE enterprise_pricing ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver precios
CREATE POLICY "Public pricing access" ON enterprise_pricing
  FOR SELECT USING (is_active = true);


-- 5. Insertar datos de precios con PROMOCIÓN 50% OFF
INSERT INTO enterprise_pricing (code, name, description, 
  regular_price_usd, regular_price_mxn, regular_price_eur,
  promo_price_usd, promo_price_mxn, promo_price_eur,
  cities_included, duration_months, features, promo_ends_at)
VALUES 
  -- City Pack: 1 ciudad, 1 mes
  ('city_pack', 'City Pack', 'Publicidad en 1 ciudad por 1 mes',
    2500, 45000, 2300,    -- Precios normales
    1250, 22500, 1150,    -- Precios promo 50% OFF
    1, 1, 
    '["Banner principal", "Carrusel destacado", "Resultados patrocinados", "Analytics básico"]'::jsonb,
    '2026-03-31 23:59:59'),
    
  -- Regional: 5 ciudades, 3 meses
  ('regional', 'Regional Pack', 'Publicidad en 5 ciudades por 3 meses',
    15000, 270000, 13800,  -- Precios normales
    7500, 135000, 6900,    -- Precios promo 50% OFF
    5, 3,
    '["Todos los espacios publicitarios", "5 ciudades", "Creativos multilingües", "Account manager dedicado", "Analytics avanzado"]'::jsonb,
    '2026-03-31 23:59:59'),
    
  -- National: Todo México, 3 meses
  ('national', 'National Coverage', 'Cobertura nacional en México por 3 meses',
    35000, 630000, 32200,  -- Precios normales
    17500, 315000, 16100,  -- Precios promo 50% OFF
    999, 3,
    '["Cobertura nacional", "Prioridad en todos los espacios", "Creativos ilimitados", "Account manager senior", "Reportes semanales", "Optimización en tiempo real"]'::jsonb,
    '2026-03-31 23:59:59'),
    
  -- Global Event: Personalizado
  ('global_event', 'Global Event', 'Campañas para eventos internacionales (FIFA 2026, etc.)',
    50000, 900000, 46000,  -- Precios normales (base)
    25000, 450000, 23000,  -- Precios promo 50% OFF (base)
    999, 3,
    '["Multi-país", "Eventos especiales", "Creativos por idioma", "Equipo dedicado", "Estrategia personalizada", "Reportes en tiempo real", "Soporte 24/7"]'::jsonb,
    '2026-03-31 23:59:59')
ON CONFLICT (code) DO UPDATE SET
  promo_price_usd = EXCLUDED.promo_price_usd,
  promo_price_mxn = EXCLUDED.promo_price_mxn,
  promo_price_eur = EXCLUDED.promo_price_eur,
  promo_ends_at = EXCLUDED.promo_ends_at;


-- 6. Función RPC para obtener precios con promoción activa
CREATE OR REPLACE FUNCTION get_enterprise_pricing()
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  regular_price_usd DECIMAL,
  current_price_usd DECIMAL,
  regular_price_mxn DECIMAL,
  current_price_mxn DECIMAL,
  discount_percent INTEGER,
  is_promo_active BOOLEAN,
  promo_ends_at TIMESTAMP,
  cities_included INTEGER,
  duration_months INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.code,
    ep.name,
    ep.description,
    ep.regular_price_usd,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() 
         THEN ep.promo_price_usd 
         ELSE ep.regular_price_usd 
    END as current_price_usd,
    ep.regular_price_mxn,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() 
         THEN ep.promo_price_mxn 
         ELSE ep.regular_price_mxn 
    END as current_price_mxn,
    CASE WHEN ep.promo_active AND ep.promo_ends_at > NOW() THEN 50 ELSE 0 END as discount_percent,
    ep.promo_active AND ep.promo_ends_at > NOW() as is_promo_active,
    ep.promo_ends_at,
    ep.cities_included,
    ep.duration_months,
    ep.features
  FROM enterprise_pricing ep
  WHERE ep.is_active = true
  ORDER BY ep.regular_price_usd ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Comentarios para documentación
COMMENT ON TABLE global_advertisers IS 'Anunciantes enterprise internacionales (Coca-Cola, Heineken, etc.)';
COMMENT ON TABLE campaign_performance IS 'Métricas detalladas de campañas por día/ciudad/dispositivo';
COMMENT ON TABLE enterprise_pricing IS 'Precios de paquetes enterprise con promoción de lanzamiento';
COMMENT ON COLUMN ad_campaigns.campaign_type IS 'Tipo: local, regional, national, global';
COMMENT ON COLUMN ad_campaigns.target_events IS 'Eventos especiales como FIFA 2026';

-- ==============================================================================
-- FIN DE MIGRACIÓN
-- NOTA: Solo se aceptan pagos digitales (tarjeta/transferencia) para enterprise
-- ==============================================================================
