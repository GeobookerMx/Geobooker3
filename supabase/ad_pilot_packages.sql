-- supabase/ad_pilot_packages.sql
-- Sistema de Paquetes Piloto y Descuentos para Geobooker Ads
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- 1. TABLA: ad_packages (Paquetes publicitarios con descuentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información básica
  name TEXT NOT NULL, -- 'piloto_30_dias', 'banner_mensual', etc.
  display_name TEXT NOT NULL, -- 'Piloto 30 Días', 'Banner Principal Mensual'
  description TEXT,
  
  -- Espacio publicitario
  slot_type TEXT NOT NULL, -- 'hero_banner', 'carousel', 'sticky_footer', etc.
  
  -- Precios (siempre en MXN)
  base_price DECIMAL(10,2) NOT NULL, -- Precio de lista original
  discount_percent INT DEFAULT 0, -- Descuento aplicado (0-100)
  final_price DECIMAL(10,2) GENERATED ALWAYS AS (base_price * (1 - discount_percent / 100.0)) STORED,
  
  -- Duración y términos
  duration_days INT NOT NULL DEFAULT 30,
  impressions_guaranteed INT, -- NULL = ilimitadas
  makegood_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80% por defecto
  
  -- Restricciones
  is_pilot BOOLEAN DEFAULT false, -- Es paquete piloto (solo para nuevos)
  max_per_customer INT DEFAULT 1, -- Máximo veces que puede comprar (1 para pilotos)
  requires_commitment BOOLEAN DEFAULT false, -- Requiere compromiso post-piloto
  commitment_months INT DEFAULT 0, -- Meses de compromiso si aplica
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- Para ordenar en UI (menor = primero)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ad_packages_slot ON ad_packages(slot_type);
CREATE INDEX IF NOT EXISTS idx_ad_packages_active ON ad_packages(is_active) WHERE is_active = true;

-- =====================================================
-- 2. INSERTAR PAQUETES PILOTO (50-70% OFF)
-- =====================================================

-- Paquete Piloto - Banner Principal (70% OFF)
INSERT INTO ad_packages (name, display_name, description, slot_type, base_price, discount_percent, duration_days, is_pilot, max_per_customer, requires_commitment, commitment_months, priority)
VALUES (
  'piloto_banner_principal',
  '🎁 Piloto Banner Principal',
  'Prueba nuestro espacio premium con 70% de descuento. Solo para nuevos anunciantes.',
  'hero_banner',
  9000.00,
  70,
  30,
  true,
  1,
  true,
  3,
  1
);

-- Paquete Piloto - Carrusel Destacado (50% OFF)
INSERT INTO ad_packages (name, display_name, description, slot_type, base_price, discount_percent, duration_days, is_pilot, max_per_customer, requires_commitment, commitment_months, priority)
VALUES (
  'piloto_carrusel',
  '🎁 Piloto Carrusel Destacado',
  'Aparece en la sección de destacados con 50% OFF por 30 días.',
  'carousel',
  5000.00,
  50,
  30,
  true,
  1,
  true,
  3,
  2
);

-- Paquete Piloto - Sticky Footer (50% OFF)
INSERT INTO ad_packages (name, display_name, description, slot_type, base_price, discount_percent, duration_days, is_pilot, max_per_customer, requires_commitment, commitment_months, priority)
VALUES (
  'piloto_sticky',
  '🎁 Piloto Banner Sticky',
  'Banner siempre visible en la parte inferior. 50% OFF para probar.',
  'sticky_footer',
  6000.00,
  50,
  30,
  true,
  1,
  false,
  0,
  3
);

-- =====================================================
-- 3. INSERTAR PAQUETES REGULARES (Precio completo)
-- =====================================================

INSERT INTO ad_packages (name, display_name, description, slot_type, base_price, discount_percent, duration_days, impressions_guaranteed, priority)
VALUES 
  ('banner_principal_mensual', 'Banner Principal', 'Máxima visibilidad debajo de la barra de búsqueda', 'hero_banner', 9000.00, 0, 30, 50000, 10),
  ('pantalla_completa', 'Pantalla Completa', 'Impacto máximo - Anuncio de pantalla completa', 'interstitial', 30000.00, 0, 30, 100000, 11),
  ('carrusel_mensual', 'Carrusel Destacado', 'Aparece en sección de negocios destacados', 'carousel', 5000.00, 0, 30, 30000, 12),
  ('sticky_mensual', 'Banner Sticky Inferior', 'Siempre visible mientras navegan', 'sticky_footer', 6000.00, 0, 30, 40000, 13),
  ('recomendados', 'Recomendados para Ti', 'Sección de negocios recomendados', 'recommendations', 2000.00, 0, 30, 15000, 14),
  ('ancho_completo', 'Ancho Completo', 'Resultados patrocinados en formato ancho', 'full_width', 12000.00, 0, 30, 60000, 15);

-- =====================================================
-- 4. TABLA: ad_credits (Créditos publicitarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Montos
  amount DECIMAL(10,2) NOT NULL, -- Monto en MXN
  remaining DECIMAL(10,2) NOT NULL, -- Saldo restante
  
  -- Origen del crédito
  source TEXT NOT NULL, -- 'referral', 'makegood', 'promo', 'manual', 'pilot_bonus'
  source_reference TEXT, -- ID de referido, campaña makegood, código promo, etc.
  
  -- Vigencia
  expires_at TIMESTAMPTZ,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ad_credits_user ON ad_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_credits_active ON ad_credits(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE ad_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
ON ad_credits FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all credits"
ON ad_credits FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- =====================================================
-- 5. TABLA: pilot_usage (Control de uso de pilotos)
-- =====================================================
CREATE TABLE IF NOT EXISTS pilot_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES ad_packages(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  
  used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados
  UNIQUE(user_id, package_id)
);

-- =====================================================
-- 6. FUNCIÓN: Verificar elegibilidad para piloto
-- =====================================================
CREATE OR REPLACE FUNCTION check_pilot_eligibility(
  p_user_id UUID,
  p_package_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_pilot BOOLEAN;
  v_max_per_customer INT;
  v_usage_count INT;
BEGIN
  -- Obtener info del paquete
  SELECT is_pilot, max_per_customer INTO v_is_pilot, v_max_per_customer
  FROM ad_packages WHERE id = p_package_id;
  
  -- Si no es piloto, siempre elegible
  IF NOT v_is_pilot THEN
    RETURN TRUE;
  END IF;
  
  -- Contar usos previos
  SELECT COUNT(*) INTO v_usage_count
  FROM pilot_usage
  WHERE user_id = p_user_id AND package_id = p_package_id;
  
  -- Verificar límite
  RETURN v_usage_count < v_max_per_customer;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN: Obtener créditos disponibles
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(remaining), 0) INTO v_total
  FROM ad_credits
  WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VISTA: Paquetes disponibles con info de descuento
-- =====================================================
CREATE OR REPLACE VIEW available_packages AS
SELECT 
  p.*,
  CASE 
    WHEN p.discount_percent > 0 THEN 
      CONCAT(p.discount_percent, '% OFF - Ahorra $', ROUND(p.base_price * p.discount_percent / 100, 0), ' MXN')
    ELSE NULL
  END as savings_text,
  CASE 
    WHEN p.is_pilot THEN '🎁 Oferta Piloto'
    WHEN p.discount_percent >= 50 THEN '🔥 Super Descuento'
    WHEN p.discount_percent > 0 THEN '💰 Descuento'
    ELSE NULL
  END as badge
FROM ad_packages p
WHERE p.is_active = true
ORDER BY p.priority, p.final_price;

COMMENT ON TABLE ad_packages IS 'Paquetes publicitarios con precios base y descuentos';
COMMENT ON TABLE ad_credits IS 'Créditos publicitarios otorgados por referidos, makegood, etc.';
COMMENT ON TABLE pilot_usage IS 'Control de uso de paquetes piloto por usuario';
