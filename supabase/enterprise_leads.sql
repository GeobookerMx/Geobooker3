-- ==============================================================================
-- TABLA: ENTERPRISE LEADS
-- ==============================================================================
-- Almacena solicitudes de cotización de anunciantes enterprise
-- ==============================================================================

CREATE TABLE IF NOT EXISTS enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información de la empresa
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  country TEXT NOT NULL,
  industry TEXT,
  company_website TEXT,
  
  -- Detalles de campaña
  selected_plan TEXT,
  target_cities TEXT,
  campaign_dates TEXT,
  budget_range TEXT,
  message TEXT,
  
  -- Estado del lead
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost'
  assigned_to TEXT, -- Email del account manager
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contacted_at TIMESTAMP
);

-- RLS
ALTER TABLE enterprise_leads ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver leads
CREATE POLICY "Admin access enterprise leads" ON enterprise_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Cualquiera puede insertar un lead (formulario público)
CREATE POLICY "Public insert enterprise leads" ON enterprise_leads
  FOR INSERT WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE enterprise_leads IS 'Solicitudes de cotización de anunciantes enterprise';
COMMENT ON COLUMN enterprise_leads.status IS 'Estado del lead: new, contacted, qualified, proposal_sent, closed_won, closed_lost';
