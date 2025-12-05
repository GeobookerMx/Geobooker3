-- =====================================================
-- Script SQL COMPLETO para Gestión de Negocios
-- VERSIÓN 2: Con campos adicionales (manager, facturación, vacantes)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- IMPORTANTE: Limpiar tabla existente (solo en desarrollo)
DROP TABLE IF EXISTS businesses CASCADE;

-- =====================================================
-- 1. TABLA: businesses (Negocios registrados en Geobooker)
-- =====================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Información Básica
  name TEXT NOT NULL,
  manager_name TEXT, -- Nombre del encargado/gerente
  description TEXT,
  category TEXT NOT NULL, -- 'restaurant', 'pharmacy', 'shop', etc.
  
  -- Ubicación y Contacto
  address TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT, -- Número de WhatsApp (puede ser diferente al teléfono)
  website TEXT,
  email TEXT,
  
  -- Redes Sociales
  facebook TEXT,
  instagram TEXT,
  tiktok TEXT,
  
  -- Ubicación Geográfica (REQUIRED)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Servicios Adicionales
  offers_invoicing BOOLEAN DEFAULT false, -- ¿Ofrece facturación?
  invoicing_details TEXT, -- Detalles sobre facturación (RFC, razón social, etc)
  has_job_openings BOOLEAN DEFAULT false, -- ¿Tiene vacantes?
  job_openings_details TEXT, -- Detalles sobre las vacantes
  
  -- Estado del negocio
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  is_featured BOOLEAN DEFAULT false,
  
  -- Multimedia y Metadata
  images TEXT[], -- Array de URLs de imágenes
  opening_hours JSONB, -- Horarios de apertura {lunes: {open:'09:00', close:'18:00'},  ...}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_featured ON businesses(is_featured) WHERE is_featured = true;

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver negocios APROBADOS (Público)
CREATE POLICY "Public can view approved businesses"
  ON businesses FOR SELECT
  USING (status = 'approved');

-- Política: El dueño puede ver sus propios negocios (aunque estén pendientes)
CREATE POLICY "Owners can view own businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

-- Política: El dueño puede crear negocios
CREATE POLICY "Authenticated users can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Política: El dueño puede actualizar sus propios negocios
CREATE POLICY "Owners can update own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

-- Política: El dueño puede eliminar sus propios negocios
CREATE POLICY "Owners can delete own businesses"
  ON businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- =====================================================
-- 3. TRIGGER para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMENTARIOS
-- =====================================================
COMMENT ON TABLE businesses IS 'Negocios registrados directamente en Geobooker (Nativos)';
COMMENT ON COLUMN businesses.status IS 'Estado de aprobación del negocio (pending, approved, rejected, suspended)';
COMMENT ON COLUMN businesses.images IS 'Array de URLs de imágenes (1 gratis, 10 premium)';
COMMENT ON COLUMN businesses.manager_name IS 'Nombre del encargado o gerente del negocio';
COMMENT ON COLUMN businesses.offers_invoicing IS 'Indica si el negocio ofrece facturación';
COMMENT ON COLUMN businesses.has_job_openings IS 'Indica si el negocio tiene vacantes laborales';
COMMENT ON COLUMN businesses.opening_hours IS 'Horarios de apertura en formato JSON';

-- =====================================================
-- 5. VERIFICACIÓN
-- =====================================================
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;
