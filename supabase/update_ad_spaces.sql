-- =====================================================
-- Actualizar ad_spaces: Reducir de 6 → 3 planes
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Desactivar todos los espacios actuales
UPDATE ad_spaces SET is_active = false;

-- 2. Verificar si ya existen los nuevos planes (por name)
-- Si no existen, insertarlos. Si ya existen, actualizarlos.

-- IMPULSO LOCAL
INSERT INTO ad_spaces (name, display_name, type, position, price_monthly, size_desktop, size_mobile, description, max_slots, is_active)
VALUES (
  'impulso_local',
  'Impulso Local',
  'local',
  'search_results',
  990,
  'Responsive',
  'Responsive',
  'Aparece en los primeros resultados de tu ciudad y categoría. Incluye CTA directo a WhatsApp, llamada o ruta.',
  20,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  price_monthly = EXCLUDED.price_monthly,
  size_desktop = EXCLUDED.size_desktop,
  size_mobile = EXCLUDED.size_mobile,
  description = EXCLUDED.description,
  max_slots = EXCLUDED.max_slots,
  is_active = true;

-- SPONSOR CIUDAD
INSERT INTO ad_spaces (name, display_name, type, position, price_monthly, size_desktop, size_mobile, description, max_slots, is_active)
VALUES (
  'sponsor_ciudad',
  'Sponsor de Ciudad',
  'premium',
  'city_hero',
  2990,
  '970x250',
  '320x100',
  'Domina tu ciudad con hero banner principal, tarjeta patrocinada y pin destacado en el mapa.',
  3,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  price_monthly = EXCLUDED.price_monthly,
  size_desktop = EXCLUDED.size_desktop,
  size_mobile = EXCLUDED.size_mobile,
  description = EXCLUDED.description,
  max_slots = EXCLUDED.max_slots,
  is_active = true;

-- ENTERPRISE
INSERT INTO ad_spaces (name, display_name, type, position, price_monthly, size_desktop, size_mobile, description, max_slots, is_active)
VALUES (
  'enterprise',
  'Enterprise / Multi-Ciudad',
  'enterprise',
  'global',
  9900,
  'Personalizado',
  'Personalizado',
  'Cobertura multi-ciudad y multi-país. Dashboard corporativo con KPIs por sucursal. Cotización personalizada.',
  5,
  true
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  position = EXCLUDED.position,
  price_monthly = EXCLUDED.price_monthly,
  size_desktop = EXCLUDED.size_desktop,
  size_mobile = EXCLUDED.size_mobile,
  description = EXCLUDED.description,
  max_slots = EXCLUDED.max_slots,
  is_active = true;

-- 3. Agregar columna whatsapp_taps a ad_campaign_metrics si no existe
ALTER TABLE ad_campaign_metrics 
ADD COLUMN IF NOT EXISTS whatsapp_taps INTEGER DEFAULT 0;

-- 4. Verificar resultado
SELECT id, name, display_name, type, price_monthly, is_active, max_slots
FROM ad_spaces
ORDER BY price_monthly ASC;

-- 5. Recargar schema
NOTIFY pgrst, 'reload schema';
