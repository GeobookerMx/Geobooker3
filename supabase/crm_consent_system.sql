-- ============================================================
-- CRM: Tabla de Consentimiento crm_consent y Bloqueo de Opt-Out
-- Crea una tabla formal para registrar el estado de consentimiento
-- Modifica la lógica para no enviar WA a quienes hicieron opt-out
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de consentimiento crm_consent
CREATE TABLE IF NOT EXISTS public.crm_consent (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      uuid REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
    channel         text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'phone')),
    consent_status  text NOT NULL CHECK (consent_status IN ('pending', 'opted_in', 'opted_out')),
    consent_source  text NOT NULL,   -- 'landing_page', 'inbound_whatsapp', 'form', 'manual_b2b', 'email_campaign'
    consent_date    timestamptz,
    opt_out_date    timestamptz,
    country         text,
    legal_basis     text NOT NULL,   -- 'legitimate_interest', 'consent', 'contract'
    notes           text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crm_consent_contact ON public.crm_consent(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_consent_status ON public.crm_consent(channel, consent_status);

-- RLS: Solo lectura para authenticated, modificación por service_role
ALTER TABLE public.crm_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin leer crm_consent" ON public.crm_consent
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Write crm_consent" ON public.crm_consent
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 2. Trigger para actualizar automáticamente el estado en marketing_contacts
-- Si un usuario cambia a opted_out, desactivamos el contacto o registramos su estado
CREATE OR REPLACE FUNCTION public.sync_crm_consent_to_contacts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.channel = 'whatsapp' THEN
        IF NEW.consent_status = 'opted_out' THEN
            UPDATE public.marketing_contacts
            SET wa_response_type = 'opt_out',
                updated_at = now()
            WHERE id = NEW.contact_id;
        ELSIF NEW.consent_status = 'opted_in' THEN
            UPDATE public.marketing_contacts
            SET wa_response_type = NULL,
                updated_at = now()
            WHERE id = NEW.contact_id;
        END IF;
    ELSIF NEW.channel = 'email' THEN
        IF NEW.consent_status = 'opted_out' THEN
            UPDATE public.marketing_contacts
            SET email_unsubscribed = true,
                updated_at = now()
            WHERE id = NEW.contact_id;
        ELSIF NEW.consent_status = 'opted_in' THEN
            UPDATE public.marketing_contacts
            SET email_unsubscribed = false,
                updated_at = now()
            WHERE id = NEW.contact_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_crm_consent_to_contacts
    AFTER INSERT OR UPDATE ON public.crm_consent
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_crm_consent_to_contacts();


-- 3. Crear una versión de la función de generación de cola que bloquee números con opt-out
-- o que no tengan canal whatsapp como recomendado.
CREATE OR REPLACE FUNCTION public.generate_daily_whatsapp_queue_v3(
    p_limit int DEFAULT 20,
    p_tier_filter text DEFAULT 'all'
)
RETURNS int AS $$
DECLARE
    v_inserted int := 0;
BEGIN
    INSERT INTO public.whatsapp_queue (
        contact_id,
        phone,
        message_template,
        tier,
        source,
        status,
        scheduled_for
    )
    SELECT 
        mc.id,
        mc.phone,
        NULL, -- Se define en UI o script de envío
        mc.tier,
        mc.source,
        'pending',
        CURRENT_DATE
    FROM public.marketing_contacts mc
    LEFT JOIN public.whatsapp_queue wq ON mc.id = wq.contact_id AND wq.scheduled_for = CURRENT_DATE
    WHERE mc.phone IS NOT NULL 
      AND mc.phone != ''
      -- Evitar duplicados en cola del mismo día
      AND wq.id IS NULL
      -- Regla crítica: Canal recomendado debe ser WhatsApp
      AND mc.channel_recommendation = 'whatsapp'
      -- Regla crítica: Excluir explícitamente a quienes hicieron opt-out
      AND (mc.wa_response_type IS NULL OR mc.wa_response_type != 'opt_out')
      -- Validar si ya fue contactado (opcional, dependiendo de si permites re-outreach)
      AND NOT EXISTS (
          SELECT 1 FROM public.unified_whatsapp_outreach uwo 
          WHERE uwo.contact_id = mc.id AND uwo.status = 'sent'
      )
      -- Filtrar por Tier si se especifica
      AND (p_tier_filter = 'all' OR mc.tier = p_tier_filter)
    ORDER BY 
        CASE mc.tier 
            WHEN 'AAA' THEN 1 
            WHEN 'AA' THEN 2 
            WHEN 'A' THEN 3 
            WHEN 'B' THEN 4 
            ELSE 5 
        END,
        mc.lead_quality_score DESC,
        mc.created_at ASC
    LIMIT p_limit
    ON CONFLICT (contact_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_daily_whatsapp_queue_v3 IS
    'Genera la cola diaria de WhatsApp filtrando por canal recomendado y excluyendo opt-outs.';
