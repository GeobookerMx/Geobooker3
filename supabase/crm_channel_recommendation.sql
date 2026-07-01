-- ============================================================
-- CRM: Channel Recommendation por país
-- Agrega campo calculado que indica el canal óptimo por país
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar campo channel_recommendation a marketing_contacts
ALTER TABLE public.marketing_contacts
    ADD COLUMN IF NOT EXISTS channel_recommendation text
        CHECK (channel_recommendation IN ('whatsapp', 'email', 'phone_call', 'no_contact'))
        DEFAULT 'email';

-- 2. Agregar campo de score de calidad
ALTER TABLE public.marketing_contacts
    ADD COLUMN IF NOT EXISTS lead_quality_score int DEFAULT 0 CHECK (lead_quality_score BETWEEN 0 AND 100);

-- 3. Actualizar channel_recommendation para todos los contactos existentes
UPDATE public.marketing_contacts SET channel_recommendation =
    CASE
        -- Alta penetración WhatsApp + LFPDPPP (B2B cold outreach permitido bajo interés legítimo)
        WHEN UPPER(COALESCE(country, '')) IN ('MX', 'MEX', 'MEXICO')                     THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('BR', 'BRA', 'BRAZIL', 'BRASIL')           THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('CO', 'COL', 'COLOMBIA')                   THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('AR', 'ARG', 'ARGENTINA')                  THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('PE', 'PER', 'PERU')                       THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('CL', 'CHL', 'CHILE')                      THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('VE', 'VEN', 'VENEZUELA')                  THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('EC', 'ECU', 'ECUADOR')                    THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('IN', 'IND', 'INDIA')                      THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('NG', 'NGA', 'NIGERIA')                    THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('ZA', 'ZAF', 'SOUTH AFRICA')               THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('AE', 'UAE', 'EMIRATOS', 'DUBAI')          THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('SA', 'SAU', 'ARABIA SAUDITA')             THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('EG', 'EGY', 'EGYPT', 'EGIPTO')            THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('PK', 'PAK', 'PAKISTAN')                   THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('ID', 'IDN', 'INDONESIA')                  THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('PH', 'PHL', 'PHILIPPINES', 'FILIPINAS')   THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('TR', 'TUR', 'TURKEY', 'TURQUIA')          THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('IT', 'ITA', 'ITALY', 'ITALIA')            THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('PT', 'PRT', 'PORTUGAL')                   THEN 'whatsapp'
        WHEN UPPER(COALESCE(country, '')) IN ('ES', 'ESP', 'SPAIN', 'ESPAÑA')            THEN 'whatsapp'

        -- Email es canal correcto (baja penetración WA o restricciones GDPR severas)
        WHEN UPPER(COALESCE(country, '')) IN ('US', 'USA', 'UNITED STATES', 'ESTADOS UNIDOS') THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('CA', 'CAN', 'CANADA')                     THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('FR', 'FRA', 'FRANCE', 'FRANCIA')          THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('DE', 'DEU', 'GERMANY', 'ALEMANIA')        THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('GB', 'GBR', 'UK', 'UNITED KINGDOM')       THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('NL', 'NLD', 'NETHERLANDS', 'HOLANDA')     THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('SE', 'SWE', 'SWEDEN', 'SUECIA')           THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('NO', 'NOR', 'NORWAY', 'NORUEGA')          THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('DK', 'DNK', 'DENMARK', 'DINAMARCA')       THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('FI', 'FIN', 'FINLAND', 'FINLANDIA')       THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('AU', 'AUS', 'AUSTRALIA')                  THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('NZ', 'NZL', 'NEW ZEALAND')                THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('CH', 'CHE', 'SWITZERLAND', 'SUIZA')       THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('AT', 'AUT', 'AUSTRIA')                    THEN 'email'

        -- WhatsApp no disponible o dominado por otras apps
        WHEN UPPER(COALESCE(country, '')) IN ('CN', 'CHN', 'CHINA')                      THEN 'no_contact'
        WHEN UPPER(COALESCE(country, '')) IN ('JP', 'JPN', 'JAPAN', 'JAPON')             THEN 'email'
        WHEN UPPER(COALESCE(country, '')) IN ('KR', 'KOR', 'KOREA', 'COREA')             THEN 'email'

        -- Default: email es siempre el canal más seguro legalmente
        ELSE 'email'
    END
WHERE channel_recommendation = 'email' OR channel_recommendation IS NULL;

-- 4. Índice para filtrar por canal recomendado rápidamente
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_channel
    ON public.marketing_contacts(channel_recommendation);

CREATE INDEX IF NOT EXISTS idx_marketing_contacts_quality
    ON public.marketing_contacts(lead_quality_score DESC);

-- 5. Vista de resumen de leads por canal y país
CREATE OR REPLACE VIEW public.crm_leads_by_channel AS
SELECT
    channel_recommendation,
    UPPER(COALESCE(country, 'UNKNOWN')) AS country,
    COUNT(*) AS total_leads,
    COUNT(CASE WHEN e164_phone IS NOT NULL AND e164_phone != '' THEN 1 END) AS leads_with_phone,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) AS leads_with_email,
    ROUND(AVG(lead_quality_score), 0) AS avg_quality_score
FROM public.marketing_contacts
GROUP BY channel_recommendation, UPPER(COALESCE(country, 'UNKNOWN'))
ORDER BY total_leads DESC;

GRANT SELECT ON public.crm_leads_by_channel TO authenticated;

COMMENT ON COLUMN public.marketing_contacts.channel_recommendation IS
    'Canal de contacto recomendado por país y penetración de WhatsApp. whatsapp=alta penetración WA, email=baja penetración WA o GDPR, no_contact=país con restricciones severas.';

COMMENT ON COLUMN public.marketing_contacts.lead_quality_score IS
    'Score 0-100 calculado al importar: teléfono válido, email, website, dirección completa, categoría.';
