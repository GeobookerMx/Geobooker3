-- ============================================================
-- CRM: Trigger para Auto-Enriquecimiento y Calidad de Leads
-- Calcula automáticamente channel_recommendation y lead_quality_score
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.enrich_marketing_contact_details()
RETURNS TRIGGER AS $$
DECLARE
    v_score int := 0;
    v_country text := 'MX';
    v_phone_clean text;
BEGIN
    -- 1. Inferir país del contacto
    IF NEW.country_code IS NOT NULL AND NEW.country_code != '' THEN
        v_country := UPPER(NEW.country_code);
    ELSIF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        -- Limpiar caracteres no numéricos
        v_phone_clean := regexp_replace(NEW.phone, '\D', '', 'g');
        IF v_phone_clean LIKE '52%' THEN
            v_country := 'MX';
        ELSIF v_phone_clean LIKE '1%' AND length(v_phone_clean) = 11 THEN
            v_country := 'US';
        ELSIF v_phone_clean LIKE '44%' THEN
            v_country := 'GB';
        ELSIF v_phone_clean LIKE '34%' THEN
            v_country := 'ES';
        ELSIF v_phone_clean LIKE '33%' THEN
            v_country := 'FR';
        ELSIF v_phone_clean LIKE '91%' THEN
            v_country := 'IN';
        ELSIF v_phone_clean LIKE '971%' THEN
            v_country := 'AE';
        ELSIF v_phone_clean LIKE '966%' THEN
            v_country := 'SA';
        ELSIF NEW.notes LIKE '%UAE%' OR NEW.notes LIKE '%Dubai%' THEN
            v_country := 'AE';
        ELSIF NEW.notes LIKE '%London%' OR NEW.notes LIKE '%UK%' THEN
            v_country := 'GB';
        ELSIF NEW.notes LIKE '%France%' OR NEW.notes LIKE '%Paris%' THEN
            v_country := 'FR';
        END IF;
    END IF;

    -- Normalizar a código ISO2 estándar
    IF v_country = 'MEX' OR v_country = 'MEXICO' THEN v_country := 'MX';
    ELSIF v_country = 'USA' OR v_country = 'UNITED STATES' THEN v_country := 'US';
    ELSIF v_country = 'CAN' OR v_country = 'CANADA' THEN v_country := 'CA';
    ELSIF v_country = 'FRA' OR v_country = 'FRANCE' THEN v_country := 'FR';
    ELSIF v_country = 'GER' OR v_country = 'GERMANY' OR v_country = 'DEU' THEN v_country := 'DE';
    ELSIF v_country = 'UK' OR v_country = 'GBR' OR v_country = 'UNITED KINGDOM' THEN v_country := 'GB';
    END IF;

    NEW.country := v_country;

    -- 2. Calcular channel_recommendation basado en el país inferido
    NEW.channel_recommendation :=
        CASE
            -- Alta penetración WhatsApp + B2B legítimo
            WHEN v_country IN ('MX', 'BR', 'CO', 'AR', 'PE', 'CL', 'VE', 'EC', 'IN', 'NG', 'ZA', 'AE', 'SA', 'EG', 'PK', 'ID', 'PH', 'TR', 'IT', 'PT', 'ES') THEN 'whatsapp'
            -- Baja penetración o restricciones legales de cold outreach
            WHEN v_country IN ('US', 'CA', 'FR', 'DE', 'GB', 'NL', 'SE', 'NO', 'DK', 'FI', 'AU', 'NZ', 'CH', 'AT', 'JP', 'KR') THEN 'email'
            -- Países restrictivos o sin uso de WA
            WHEN v_country IN ('CN') THEN 'no_contact'
            ELSE 'email'
        END;

    -- 3. Calcular score de calidad del lead (lead_quality_score)
    -- Has phone (+30)
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        v_score := v_score + 30;
        -- Formato E164 preliminar válido (+10 adicional)
        IF NEW.phone ~ '^\+?[1-9]\d{1,14}$' THEN
            v_score := v_score + 10;
        END IF;
    END IF;

    -- Has email (+20)
    IF NEW.email IS NOT NULL AND NEW.email != '' AND NEW.email LIKE '%@%.%' THEN
        v_score := v_score + 20;
    END IF;

    -- Has website en notas o dirección (+15)
    IF NEW.notes LIKE '%Web: http%' OR NEW.notes LIKE '%Website: http%' THEN
        v_score := v_score + 15;
    END IF;

    -- Has address/city info (+15)
    IF NEW.city IS NOT NULL AND NEW.city != '' THEN
        v_score := v_score + 15;
    END IF;

    -- Has contact name / company name (+10)
    IF NEW.contact_name IS NOT NULL AND NEW.contact_name != '' THEN
        v_score := v_score + 10;
    END IF;

    NEW.lead_quality_score := LEAST(GREATEST(v_score, 0), 100);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el Trigger sobre marketing_contacts
DROP TRIGGER IF EXISTS trg_enrich_marketing_contact_details ON public.marketing_contacts;

CREATE TRIGGER trg_enrich_marketing_contact_details
    BEFORE INSERT OR UPDATE OF phone, email, country_code, city, contact_name, notes
    ON public.marketing_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.enrich_marketing_contact_details();

COMMENT ON FUNCTION public.enrich_marketing_contact_details() IS
    'Enriquece automáticamente el país, canal de contacto recomendado y score de calidad de un lead al insertarse o modificarse.';
