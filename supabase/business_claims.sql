-- =====================================================
-- Tabla: business_claims
-- Sistema de reclamo de negocios para Geobooker
-- Compatible con negocios nativos, DENUE y Overture
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA: business_claims
CREATE TABLE IF NOT EXISTS business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identidad del reclamante
  claimer_name TEXT NOT NULL,
  claimer_role TEXT NOT NULL DEFAULT 'owner', -- owner, manager, representative
  email TEXT NOT NULL,
  phone TEXT,

  -- Evidencia
  website TEXT,
  social_media TEXT,                     -- URL de red social del negocio
  evidence_description TEXT,             -- Descripción de la evidencia
  evidence_photo_url TEXT,               -- Foto del local / constancia / ID

  -- Estado de revisión
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  review_notes TEXT,                     -- Notas del admin al revisar
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_business_claims_business ON business_claims(business_id);
CREATE INDEX idx_business_claims_user ON business_claims(user_id);
CREATE INDEX idx_business_claims_status ON business_claims(status);

-- Un usuario solo puede tener un claim activo por negocio
CREATE UNIQUE INDEX uq_active_claim_per_business
  ON business_claims(business_id, user_id)
  WHERE status IN ('submitted', 'under_review');

-- RLS
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede crear un claim
CREATE POLICY "Users can create claims"
  ON business_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden ver sus propios claims
CREATE POLICY "Users can view own claims"
  ON business_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Los admins pueden ver y modificar todos los claims
CREATE POLICY "Admins can view all claims"
  ON business_claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update claims"
  ON business_claims FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER update_business_claims_updated_at
  BEFORE UPDATE ON business_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. Asegurar columnas de claim en businesses
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_claimed'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_claimed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE businesses ADD COLUMN claimed_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =====================================================
-- 3. Columnas de trazabilidad de fuente (para DENUE/Overture)
--    Esto permite que el claim funcione igual para negocios
--    importados del DENUE/Overture que para negocios nativos
-- =====================================================
DO $$
BEGIN
  -- Tipo de fuente: native (usuario), seed_denue, seed_overture, bulk_import
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN source_type TEXT DEFAULT 'native';
  END IF;

  -- ID del registro original en la fuente (denue_id, overture_id, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'source_record_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN source_record_id TEXT;
  END IF;

  -- Texto de atribución requerido por la licencia de uso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'attribution_text'
  ) THEN
    ALTER TABLE businesses ADD COLUMN attribution_text TEXT;
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICACIÓN
-- =====================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('business_claims', 'businesses')
  AND column_name IN (
    'is_claimed', 'claimed_by', 'claimed_at',
    'source_type', 'source_record_id', 'attribution_text',
    'claimer_name', 'status', 'evidence_photo_url'
  )
ORDER BY table_name, ordinal_position;
