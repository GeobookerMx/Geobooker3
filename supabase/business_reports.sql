-- supabase/business_reports.sql
-- Tabla para reportes de información incorrecta de negocios (P1.2)

-- Crear tabla de reportes
CREATE TABLE IF NOT EXISTS business_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL, -- 'closed', 'wrong_phone', 'wrong_address', 'wrong_hours', 'wrong_name', 'spam', 'other'
  details TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'fixed', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON business_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_business ON business_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON business_reports(created_at DESC);

-- RLS
ALTER TABLE business_reports ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear reportes
CREATE POLICY "Anyone can create reports"
ON business_reports FOR INSERT
TO authenticated
WITH CHECK (true);

-- Solo admins pueden ver/modificar todos los reportes
CREATE POLICY "Admins can view all reports"
ON business_reports FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

CREATE POLICY "Admins can update reports"
ON business_reports FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- Vista para panel admin con info del negocio
CREATE OR REPLACE VIEW admin_reports_view AS
SELECT 
  r.*,
  b.name as business_name,
  b.category as business_category,
  b.address as business_address
FROM business_reports r
LEFT JOIN businesses b ON r.business_id = b.id
ORDER BY r.created_at DESC;

COMMENT ON TABLE business_reports IS 'Reportes de usuarios sobre información incorrecta de negocios';
