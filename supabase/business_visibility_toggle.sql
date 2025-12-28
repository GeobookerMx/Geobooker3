-- =====================================================
-- Toggle Visibilidad de Negocio (Abrir/Cerrar Digital)
-- Ejecutar esto en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columna is_visible a businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- 2. Índice para filtrar negocios visibles
CREATE INDEX IF NOT EXISTS idx_businesses_visible ON businesses(is_visible);

-- Listo! Ahora los negocios pueden marcarse como visibles/no visibles
