-- =====================================================
-- SCAN & INVITE - Sistema de Captura de Leads
-- Versión 1.0 - Admin Only (escalable para equipo)
-- =====================================================

-- Tabla: Escaneos realizados
CREATE TABLE IF NOT EXISTS scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL, -- Quien ejecutó el scan
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_km INTEGER DEFAULT 3,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled', 'paused')),
  total_found INTEGER DEFAULT 0,
  total_new INTEGER DEFAULT 0,
  total_duplicates INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}', -- Filtros aplicados
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Leads capturados
CREATE TABLE IF NOT EXISTS scan_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id UUID REFERENCES scan_runs(id) ON DELETE CASCADE,
  place_id TEXT, -- Google Place ID
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(5, 2),
  website TEXT,
  google_maps_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'not_interested', 'converted', 'blacklisted')),
  notes TEXT,
  captured_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Prevenir duplicados por place_id
  UNIQUE(place_id)
);

-- Tabla: Contactos de leads (teléfonos/emails)
CREATE TABLE IF NOT EXISTS scan_lead_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES scan_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('phone', 'email')),
  value TEXT NOT NULL,
  normalized_value TEXT, -- +52 format para teléfonos
  is_valid BOOLEAN DEFAULT true,
  is_whatsapp BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'google_places', -- google_places, website_scrape
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, type, value)
);

-- Tabla: Registro de invitaciones enviadas
CREATE TABLE IF NOT EXISTS scan_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES scan_leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES scan_lead_contacts(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL, -- Quien envió
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'call')),
  message_template TEXT,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'replied', 'no_reply', 'opted_out')),
  attempted_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Blacklist (no contactar)
CREATE TABLE IF NOT EXISTS scan_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT,
  email TEXT,
  place_id TEXT,
  reason TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: Configuración de límites por usuario
CREATE TABLE IF NOT EXISTS scan_user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  daily_outreach_limit INTEGER DEFAULT 20,
  can_scan BOOLEAN DEFAULT false, -- Solo admins pueden habilitar
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_scan_leads_place_id ON scan_leads(place_id);
CREATE INDEX IF NOT EXISTS idx_scan_leads_status ON scan_leads(status);
CREATE INDEX IF NOT EXISTS idx_scan_leads_scan_run ON scan_leads(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_scan_outreach_lead ON scan_outreach(lead_id);
CREATE INDEX IF NOT EXISTS idx_scan_outreach_user ON scan_outreach(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_outreach_date ON scan_outreach(attempted_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_user_limits ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admins pueden ver/modificar
CREATE POLICY "Admins can manage scan_runs" ON scan_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scan_leads" ON scan_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scan_lead_contacts" ON scan_lead_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scan_outreach" ON scan_outreach
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scan_blacklist" ON scan_blacklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage scan_user_limits" ON scan_user_limits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función: Normalizar teléfono mexicano
CREATE OR REPLACE FUNCTION normalize_mx_phone(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  -- Remover todo excepto dígitos
  clean_phone := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Si tiene 10 dígitos, agregar +52
  IF length(clean_phone) = 10 THEN
    RETURN '+52' || clean_phone;
  -- Si tiene 12 dígitos y empieza con 52, agregar +
  ELSIF length(clean_phone) = 12 AND clean_phone LIKE '52%' THEN
    RETURN '+' || clean_phone;
  -- Si tiene 13 dígitos y empieza con +52, retornar tal cual
  ELSIF length(clean_phone) = 13 AND clean_phone LIKE '+52%' THEN
    RETURN clean_phone;
  ELSE
    -- Retornar con + si no tiene
    RETURN CASE WHEN clean_phone LIKE '+%' THEN clean_phone ELSE '+' || clean_phone END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función: Contar outreach del día
CREATE OR REPLACE FUNCTION get_daily_outreach_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM scan_outreach
    WHERE user_id = p_user_id
    AND attempted_at >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si lead está en blacklist
CREATE OR REPLACE FUNCTION is_blacklisted(p_phone TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL, p_place_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM scan_blacklist
    WHERE (p_phone IS NOT NULL AND phone = p_phone)
       OR (p_email IS NOT NULL AND email = p_email)
       OR (p_place_id IS NOT NULL AND place_id = p_place_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSERTAR LÍMITE INICIAL PARA ADMIN
-- =====================================================
INSERT INTO scan_user_limits (user_id, daily_outreach_limit, can_scan)
SELECT id, 20, true FROM auth.users WHERE email = 'jpvaness85@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET can_scan = true, daily_outreach_limit = 20;
