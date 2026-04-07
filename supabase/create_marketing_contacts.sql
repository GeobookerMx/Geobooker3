-- 📋 Tabla marketing_contacts para el CRM de Geobooker
-- Ejecutar en: Supabase → SQL Editor → New Query → Pegar → Run

CREATE TABLE IF NOT EXISTS public.marketing_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      TEXT,
  contact_name      TEXT,
  contact_title     TEXT,
  email             TEXT UNIQUE,        -- Clave única para evitar duplicados
  phone             TEXT,
  website           TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  tier              TEXT CHECK (tier IN ('AAA', 'AA', 'A', 'B')),
  source            TEXT DEFAULT 'manual',  -- 'csv_import', 'denue', 'manual'
  status            TEXT DEFAULT 'pendiente' CHECK (status IN (
                      'pendiente', 'contactado', 'interesado', 'convertido', 'descartado'
                    )),
  email_sent_at     TIMESTAMPTZ,
  email_opened_at   TIMESTAMPTZ,
  notes             TEXT,
  assigned_to       UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_marketing_tier ON public.marketing_contacts(tier);
CREATE INDEX IF NOT EXISTS idx_marketing_status ON public.marketing_contacts(status);
CREATE INDEX IF NOT EXISTS idx_marketing_state ON public.marketing_contacts(state);
CREATE INDEX IF NOT EXISTS idx_marketing_source ON public.marketing_contacts(source);

-- RLS: solo admins pueden ver/editar (la tabla es interna del equipo)
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins pueden gestionar marketing_contacts"
  ON public.marketing_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Service role siempre puede (necesario para el script de importación y N8N)
CREATE POLICY "Service role acceso total"
  ON public.marketing_contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_contacts_updated_at
  BEFORE UPDATE ON public.marketing_contacts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Habilitar Realtime (para que N8N reciba webhooks en tiempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_contacts;

-- Vista de resumen por tier (útil para el dashboard)
CREATE OR REPLACE VIEW public.crm_summary AS
SELECT
  tier,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN status = 'contactado' THEN 1 END) as contactados,
  COUNT(CASE WHEN status = 'interesado' THEN 1 END) as interesados,
  COUNT(CASE WHEN status = 'convertido' THEN 1 END) as convertidos,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as con_email
FROM public.marketing_contacts
GROUP BY tier
ORDER BY CASE tier WHEN 'AAA' THEN 1 WHEN 'AA' THEN 2 WHEN 'A' THEN 3 ELSE 4 END;
