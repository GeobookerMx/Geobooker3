-- Crear tabla optimizada para marketing automation
-- Diseñada para manejar 16,000+ contactos con segmentación por tiers

-- ==================================================
-- 1. TABLA PRINCIPAL: marketing_contacts
-- ==================================================
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Información básica
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT UNIQUE,  -- ✅ UNIQUE para evitar duplicados
  phone TEXT,
  
  -- Clasificación
  tier TEXT CHECK (tier IN ('AAA', 'AA', 'A', 'B', 'UNCLASSIFIED')),
  category TEXT,
  industry TEXT,
  
  -- Ubicación
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'MX',
  
  -- Metadata
  source TEXT, -- 'manual_import', 'apify_scraping', 'google_maps', etc.
  import_date TIMESTAMP DEFAULT NOW(),
  
  -- Control de campañas
  email_status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'bounced', 'unsubscribed'
  last_email_sent TIMESTAMP,
  email_sent_count INTEGER DEFAULT 0,
  
  whatsapp_status TEXT DEFAULT 'pending',
  last_whatsapp_sent TIMESTAMP,
  whatsapp_sent_count INTEGER DEFAULT 0,
  
  -- Asignación de cuentas
  assigned_email_sender TEXT, -- 'ventasgeobooker@gmail.com' o 'geobookerr@gmail.com'
  
  -- Engagement
  email_opened BOOLEAN DEFAULT FALSE,
  email_clicked BOOLEAN DEFAULT FALSE,
  responded BOOLEAN DEFAULT FALSE,
  
  -- Notas
  notes TEXT,
  
  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 2. ÍNDICES para optimizar queries
-- ==================================================
CREATE INDEX idx_marketing_contacts_tier ON marketing_contacts(tier);
CREATE INDEX idx_marketing_contacts_email_status ON marketing_contacts(email_status);
CREATE INDEX idx_marketing_contacts_assigned_sender ON marketing_contacts(assigned_email_sender);
CREATE INDEX idx_marketing_contacts_email ON marketing_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_marketing_contacts_phone ON marketing_contacts(phone) WHERE phone IS NOT NULL;

-- ==================================================
-- 3. TABLA: email_queue (Cola diaria)
-- ==================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  
  -- Configuración
  assigned_sender TEXT NOT NULL,
  template_id UUID,
  scheduled_for TIMESTAMP NOT NULL,
  
  -- Estado
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  sent_at TIMESTAMP,
  error_message TEXT,
  
  -- Prioridad
  priority INTEGER DEFAULT 0, -- AAA=1, AA=2, A=3, B=4
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_sender ON email_queue(assigned_sender);

-- ==================================================
-- 4. TABLA: whatsapp_queue
-- ==================================================
CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  
  message TEXT,
  scheduled_for TIMESTAMP NOT NULL,
  
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  marked_sent_by UUID, -- user_id que marcó como enviado
  
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_queue_status ON whatsapp_queue(status);
CREATE INDEX idx_whatsapp_queue_scheduled ON whatsapp_queue(scheduled_for);

-- ==================================================
-- 5. TABLA: campaign_history
-- ==================================================
CREATE TABLE IF NOT EXISTS campaign_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES marketing_contacts(id),
  
  campaign_type TEXT, -- 'email', 'whatsapp'
  template_id UUID,
  
  sent_via TEXT, -- cuenta que envió
  sent_at TIMESTAMP NOT NULL,
  
  -- Métricas
  delivered BOOLEAN DEFAULT TRUE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  bounced BOOLEAN DEFAULT FALSE,
  unsubscribed BOOLEAN DEFAULT FALSE,
  
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_history_contact ON campaign_history(contact_id);
CREATE INDEX idx_campaign_history_type ON campaign_history(campaign_type);
CREATE INDEX idx_campaign_history_date ON campaign_history(sent_at);

-- ==================================================
-- 6. TABLA: automation_config
-- ==================================================
CREATE TABLE IF NOT EXISTS automation_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Configuración de límites
  daily_email_limit_ventas INTEGER DEFAULT 400,
  daily_email_limit_general INTEGER DEFAULT 400,
  daily_whatsapp_limit INTEGER DEFAULT 20,
  
  -- Distribución por tier
  tier_aaa_limit INTEGER DEFAULT 200,
  tier_aa_limit INTEGER DEFAULT 200,
  tier_a_limit INTEGER DEFAULT 300,
  tier_b_limit INTEGER DEFAULT 100,
  
  -- Control de warming
  warming_mode BOOLEAN DEFAULT FALSE,
  warming_daily_limit INTEGER DEFAULT 100,
  
  -- Estado
  automation_active BOOLEAN DEFAULT TRUE,
  
  -- Horarios
  send_time_morning TIME DEFAULT '09:00:00',
  send_time_afternoon TIME DEFAULT '14:00:00',
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración por default
INSERT INTO automation_config (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- ==================================================
-- 7. FUNCIÓN: Clasificar Tier Automáticamente
-- ==================================================
CREATE OR REPLACE FUNCTION auto_classify_tier(
  p_category TEXT,
  p_industry TEXT,
  p_company_name TEXT
) RETURNS TEXT AS $$
DECLARE
  tier TEXT := 'B'; -- Default
BEGIN
  -- AAA: Industrias premium o empresas grandes
  IF p_category IN ('Tecnología', 'Finanzas', 'Salud', 'Corporativo') 
     OR p_industry IN ('Tech', 'Finance', 'Healthcare', 'Enterprise')
     OR p_company_name ~* '(S\.A\.|SA|Corporativo|Grupo|Holdings)' THEN
    tier := 'AAA';
    
  -- AA: Medianas empresas o industrias importantes
  ELSIF p_category IN ('Comercio', 'Servicios Profesionales', 'Manufactura')
        OR p_industry IN ('Retail', 'Professional Services', 'Manufacturing') THEN
    tier := 'AA';
    
  -- A: PyMEs y negocios locales establecidos
  ELSIF p_category IN ('Restaurante', 'Tienda', 'Servicios') THEN
    tier := 'A';
  
  -- B: Resto
  ELSE
    tier := 'B';
  END IF;
  
  RETURN tier;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 8. FUNCIÓN: Asignar Cuenta de Email  
-- ==================================================
CREATE OR REPLACE FUNCTION assign_email_sender(p_tier TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_tier IN ('AAA', 'AA') THEN
    RETURN 'ventasgeobooker@gmail.com';
  ELSE
    RETURN 'geobookerr@gmail.com';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 9. FUNCIÓN: Generar Cola Diaria
-- ==================================================
CREATE OR REPLACE FUNCTION generate_daily_email_queue()
RETURNS INTEGER AS $$
DECLARE
  config RECORD;
  contacts_added INTEGER := 0;
  rows_affected INTEGER;
BEGIN
  -- Obtener configuración
  SELECT * INTO config FROM automation_config LIMIT 1;
  
  IF NOT config.automation_active THEN
    RAISE NOTICE 'Automatización desactivada';
    RETURN 0;
  END IF;
  
  -- Limpiar cola antigua
  DELETE FROM email_queue WHERE status = 'pending' AND scheduled_for < NOW() - INTERVAL '1 day';
  
  -- Tier AAA
  INSERT INTO email_queue (contact_id, assigned_sender, scheduled_for, priority)
  SELECT 
    id,
    'ventasgeobooker@gmail.com',
    NOW() + INTERVAL '1 hour', -- 1 hora desde ahora
    1
  FROM marketing_contacts
  WHERE tier = 'AAA'
    AND email IS NOT NULL
    AND email_status = 'pending'
    AND is_active = TRUE
  LIMIT config.tier_aaa_limit;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  contacts_added := contacts_added + rows_affected;
  
  -- Tier AA
  INSERT INTO email_queue (contact_id, assigned_sender, scheduled_for, priority)
  SELECT 
    id,
    'ventasgeobooker@gmail.com',
    NOW() + INTERVAL '2 hours',
    2
  FROM marketing_contacts
  WHERE tier = 'AA'
    AND email IS NOT NULL
    AND email_status = 'pending'
    AND is_active = TRUE
  LIMIT config.tier_aa_limit;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  contacts_added := contacts_added + rows_affected;
  
  -- Similar para A y B...
  
  RETURN contacts_added;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 10. TRIGGER: Auto-actualizar updated_at
-- ==================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketing_contacts_updated_at
  BEFORE UPDATE ON marketing_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE marketing_contacts IS 'Contactos para marketing automation con 16,000+ leads';
COMMENT ON TABLE email_queue IS 'Cola diaria de emails a enviar';
COMMENT ON TABLE campaign_history IS 'Historial de todas las campañas enviadas';
