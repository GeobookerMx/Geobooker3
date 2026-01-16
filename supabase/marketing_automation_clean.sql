-- SQL LIMPIO: Solo crear tablas que faltan (sin duplicar índices)
-- Ejecutar si marketing_automation.sql dio error

-- 1. AUTOMATION CONFIG
CREATE TABLE IF NOT EXISTS automation_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_type TEXT NOT NULL UNIQUE,
  daily_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configs por defecto
INSERT INTO automation_config (campaign_type, daily_limit, is_active)
VALUES 
  ('email', 100, TRUE),
  ('whatsapp', 20, TRUE)
ON CONFLICT (campaign_type) DO NOTHING;

-- 2. CAMPAIGN HISTORY
CREATE TABLE IF NOT EXISTS campaign_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES marketing_contacts(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  error_message TEXT,
  message_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_history_contact ON campaign_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_history_type ON campaign_history(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_history_sent_at ON campaign_history(sent_at);

-- 3. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  tier_target TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template por defecto
INSERT INTO email_templates (name, subject, html_content, tier_target, is_active)
VALUES (
  'Geobooker - Presentación',
  'Aumenta la visibilidad de tu negocio con Geobooker',
  '<html><body><h1>Hola {contact_name}</h1><p>Te presentamos Geobooker...</p></body></html>',
  NULL,
  TRUE
)
ON CONFLICT DO NOTHING;

-- 4. FUNCIÓN: Generate Email Queue
CREATE OR REPLACE FUNCTION generate_daily_email_queue(
  p_limit INTEGER DEFAULT 100,
  p_tier_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  contacts_added INTEGER,
  tier_distribution JSONB
) AS $$
DECLARE
  v_contacts_added INTEGER;
  v_tier_dist JSONB;
BEGIN
  -- Seleccionar contactos pendientes
  WITH selected_contacts AS (
    SELECT id, tier
    FROM marketing_contacts
    WHERE email_status = 'pending'
      AND email IS NOT NULL
      AND (p_tier_filter IS NULL OR tier = p_tier_filter)
    ORDER BY 
      CASE tier
        WHEN 'AAA' THEN 1
        WHEN 'AA' THEN 2
        WHEN 'A' THEN 3
        WHEN 'B' THEN 4
        ELSE 5
      END,
      created_at ASC
    LIMIT p_limit
  )
  SELECT COUNT(*), jsonb_object_agg(tier, count)
  INTO v_contacts_added, v_tier_dist
  FROM (
    SELECT tier, COUNT(*) as count
    FROM selected_contacts
    GROUP BY tier
  ) tier_counts;

  RETURN QUERY SELECT v_contacts_added, v_tier_dist;
END;
$$ LANGUAGE plpgsql;

-- ✅ Listo! Estas son las tablas críticas para email
