-- ============================================================================
-- CRM + APIFY + WHATSAPP GLOBAL HARDENING
-- Agrega country_code y corrige la sincronizacion Apify -> marketing_contacts
-- Ejecutar completo en Supabase SQL Editor
-- ============================================================================

ALTER TABLE public.marketing_contacts
ADD COLUMN IF NOT EXISTS country_code TEXT;

ALTER TABLE public.scraping_history
ADD COLUMN IF NOT EXISTS country_code TEXT;

CREATE INDEX IF NOT EXISTS idx_marketing_contacts_country_code
ON public.marketing_contacts(country_code);

CREATE INDEX IF NOT EXISTS idx_scraping_history_country_code
ON public.scraping_history(country_code);

UPDATE public.scraping_history
SET country_code = CASE
    WHEN country_code IS NOT NULL AND btrim(country_code) <> '' THEN upper(country_code)
    WHEN lower(coalesce(search_location, '')) ~ '(mexico|m?xico|cdmx|guadalajara|monterrey|jalisco|nuevo le?n|puebla|quer?taro)' THEN 'MX'
    WHEN lower(coalesce(search_location, '')) ~ '(usa|united states|los angeles|california|texas|new york|florida|miami|houston|dallas|chicago)' THEN 'US'
    WHEN lower(coalesce(search_location, '')) ~ '(canada|toronto|vancouver|montreal|ottawa|calgary)' THEN 'CA'
    WHEN lower(coalesce(search_location, '')) ~ '(uk|united kingdom|london|manchester|birmingham|liverpool|glasgow)' THEN 'GB'
    WHEN lower(coalesce(search_location, '')) ~ '(spain|espa?a|madrid|barcelona|valencia|sevilla)' THEN 'ES'
    WHEN lower(coalesce(search_location, '')) ~ '(france|paris|lyon|marseille)' THEN 'FR'
    WHEN lower(coalesce(search_location, '')) ~ '(germany|berlin|munich|hamburg|frankfurt)' THEN 'DE'
    WHEN lower(coalesce(search_location, '')) ~ '(portugal|lisbon|porto)' THEN 'PT'
    WHEN lower(coalesce(search_location, '')) ~ '(ireland|dublin)' THEN 'IE'
    WHEN lower(coalesce(search_location, '')) ~ '(australia|sydney|melbourne|brisbane|perth)' THEN 'AU'
    WHEN lower(coalesce(search_location, '')) ~ '(new zealand|auckland|wellington)' THEN 'NZ'
    WHEN lower(coalesce(search_location, '')) ~ '(argentina|buenos aires)' THEN 'AR'
    WHEN lower(coalesce(search_location, '')) ~ '(chile|santiago)' THEN 'CL'
    WHEN lower(coalesce(search_location, '')) ~ '(colombia|bogot?|bogota|medell?n|medellin|cartagena)' THEN 'CO'
    WHEN lower(coalesce(search_location, '')) ~ '(peru|per?|lima)' THEN 'PE'
    WHEN lower(coalesce(search_location, '')) ~ '(ecuador|quito)' THEN 'EC'
    WHEN lower(coalesce(search_location, '')) ~ '(brazil|brasil|s?o paulo|sao paulo|rio de janeiro)' THEN 'BR'
    ELSE country_code
END
WHERE country_code IS NULL OR btrim(country_code) = '';

UPDATE public.marketing_contacts mc
SET country_code = COALESCE(
    mc.country_code,
    (
        SELECT sh.country_code
        FROM public.scraping_history sh
        WHERE sh.phone = mc.phone
          AND sh.country_code IS NOT NULL
          AND btrim(sh.country_code) <> ''
        ORDER BY sh.scraped_at DESC NULLS LAST, sh.created_at DESC NULLS LAST
        LIMIT 1
    )
)
WHERE (mc.country_code IS NULL OR btrim(mc.country_code) = '')
  AND mc.source = 'apify';

CREATE OR REPLACE FUNCTION public.sync_apify_leads_to_marketing()
RETURNS TABLE (
    synced INTEGER,
    skipped INTEGER,
    with_email INTEGER
)
AS $$
DECLARE
    v_synced INTEGER := 0;
    v_skipped INTEGER := 0;
    v_with_email INTEGER := 0;
BEGIN
    WITH new_contacts AS (
        SELECT DISTINCT ON (COALESCE(NULLIF(sh.phone, ''), NULLIF(lower(sh.email), '')))
            sh.name AS company_name,
            NULL::TEXT AS contact_name,
            sh.phone AS phone,
            sh.email AS email,
            COALESCE(sh.tier, 'B') AS tier,
            sh.city AS city,
            upper(sh.country_code) AS country_code,
            'apify' AS source,
            CONCAT(
                'Apify Scraping | ',
                coalesce(sh.search_query, 'sin query'),
                ' @ ',
                coalesce(sh.search_location, 'sin ubicacion'),
                CASE WHEN sh.website IS NOT NULL AND btrim(sh.website) <> '' THEN ' | Web: ' || sh.website ELSE '' END,
                CASE WHEN sh.address IS NOT NULL AND btrim(sh.address) <> '' THEN ' | Address: ' || sh.address ELSE '' END
            ) AS notes
        FROM public.scraping_history sh
        WHERE sh.source = 'apify'
          AND (
              (sh.phone IS NOT NULL AND btrim(sh.phone) <> '')
              OR
              (sh.email IS NOT NULL AND btrim(sh.email) <> '')
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.marketing_contacts mc
              WHERE (sh.phone IS NOT NULL AND btrim(sh.phone) <> '' AND mc.phone = sh.phone)
                 OR (sh.email IS NOT NULL AND btrim(sh.email) <> '' AND lower(mc.email) = lower(sh.email))
          )
    )
    INSERT INTO public.marketing_contacts (
        company_name,
        contact_name,
        phone,
        email,
        tier,
        city,
        country_code,
        source,
        notes
    )
    SELECT
        company_name,
        contact_name,
        phone,
        email,
        tier,
        city,
        country_code,
        source,
        notes
    FROM new_contacts;

    GET DIAGNOSTICS v_synced = ROW_COUNT;

    SELECT COUNT(*) INTO v_with_email
    FROM public.marketing_contacts
    WHERE source = 'apify'
      AND email IS NOT NULL
      AND btrim(email) <> '';

    SELECT COUNT(*) INTO v_skipped
    FROM public.scraping_history sh
    WHERE sh.source = 'apify'
      AND (
          (sh.phone IS NOT NULL AND btrim(sh.phone) <> '')
          OR
          (sh.email IS NOT NULL AND btrim(sh.email) <> '')
      )
      AND EXISTS (
          SELECT 1
          FROM public.marketing_contacts mc
          WHERE (sh.phone IS NOT NULL AND btrim(sh.phone) <> '' AND mc.phone = sh.phone)
             OR (sh.email IS NOT NULL AND btrim(sh.email) <> '' AND lower(mc.email) = lower(sh.email))
      );

    RETURN QUERY SELECT v_synced, v_skipped, v_with_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
