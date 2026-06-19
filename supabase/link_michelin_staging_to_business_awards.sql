-- ================================================================
-- LINK MICHELIN STAGING -> BUSINESSES -> BUSINESS_AWARDS
-- Uso:
-- 1. Ejecutar despues de:
--    - create_business_awards_system.sql
--    - seed_michelin_mexico_2026_staging.sql
-- 2. Revisa las consultas finales de validacion.
-- 3. Si algun restaurante queda sin match, ligalo manualmente en staging.
-- ================================================================

-- ------------------------------------------------
-- 1. Preparar columnas de vinculacion en staging
-- ------------------------------------------------
ALTER TABLE business_awards_import_staging
ADD COLUMN IF NOT EXISTS matched_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE business_awards_import_staging
ADD COLUMN IF NOT EXISTS match_strategy TEXT;

ALTER TABLE business_awards_import_staging
ADD COLUMN IF NOT EXISTS match_confidence INTEGER DEFAULT 0;

ALTER TABLE business_awards_import_staging
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_awards_staging_matched_business
ON business_awards_import_staging(matched_business_id);

-- ------------------------------------------------
-- 2. Normalizador local para texto de matching
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_award_match_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            TRANSLATE(
                COALESCE(input_text, ''),
                'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
                'aaaaeeeeiiiioooouuuunAAAAEEEEIIIIOOOOUUUUN'
            ),
            '[^a-zA-Z0-9]+',
            ' ',
            'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------
-- 3. Reset de matches automaticos previos
-- ------------------------------------------------
UPDATE business_awards_import_staging
SET matched_business_id = NULL,
    match_strategy = NULL,
    match_confidence = 0,
    linked_at = NULL;

-- ------------------------------------------------
-- 4. Match automatico de alta confianza
-- ------------------------------------------------
WITH candidate_matches AS (
    SELECT
        s.id AS staging_id,
        b.id AS business_id,
        CASE
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 AND COALESCE(normalize_award_match_text(b.city_name), '') = COALESCE(normalize_award_match_text(s.city), '')
                 THEN 100
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 AND normalize_award_match_text(COALESCE(b.address, '')) LIKE '%' || normalize_award_match_text(COALESCE(s.city, '')) || '%'
                 THEN 96
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 THEN 90
            WHEN normalize_award_match_text(b.name) LIKE '%' || normalize_award_match_text(s.raw_name) || '%'
                 THEN 82
            WHEN normalize_award_match_text(s.raw_name) LIKE '%' || normalize_award_match_text(b.name) || '%'
                 THEN 80
            ELSE 0
        END AS confidence,
        CASE
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 AND COALESCE(normalize_award_match_text(b.city_name), '') = COALESCE(normalize_award_match_text(s.city), '')
                 THEN 'exact_name_city'
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 AND normalize_award_match_text(COALESCE(b.address, '')) LIKE '%' || normalize_award_match_text(COALESCE(s.city, '')) || '%'
                 THEN 'exact_name_address_city_hint'
            WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                 THEN 'exact_name'
            WHEN normalize_award_match_text(b.name) LIKE '%' || normalize_award_match_text(s.raw_name) || '%'
                 THEN 'business_name_contains_stage_name'
            WHEN normalize_award_match_text(s.raw_name) LIKE '%' || normalize_award_match_text(b.name) || '%'
                 THEN 'stage_name_contains_business_name'
            ELSE 'no_match'
        END AS strategy,
        ROW_NUMBER() OVER (
            PARTITION BY s.id
            ORDER BY
                CASE
                    WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                         AND COALESCE(normalize_award_match_text(b.city_name), '') = COALESCE(normalize_award_match_text(s.city), '')
                         THEN 100
                    WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                         AND normalize_award_match_text(COALESCE(b.address, '')) LIKE '%' || normalize_award_match_text(COALESCE(s.city, '')) || '%'
                         THEN 96
                    WHEN normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
                         THEN 90
                    WHEN normalize_award_match_text(b.name) LIKE '%' || normalize_award_match_text(s.raw_name) || '%'
                         THEN 82
                    WHEN normalize_award_match_text(s.raw_name) LIKE '%' || normalize_award_match_text(b.name) || '%'
                         THEN 80
                    ELSE 0
                END DESC,
                b.updated_at DESC NULLS LAST,
                b.created_at DESC NULLS LAST
        ) AS rn
    FROM business_awards_import_staging s
    JOIN businesses b
      ON COALESCE(b.country_code, 'MX') = COALESCE(s.country, 'MX')
     AND b.status = 'approved'
     AND COALESCE(b.is_visible, TRUE) = TRUE
     AND (
          normalize_award_match_text(b.name) = normalize_award_match_text(s.raw_name)
       OR normalize_award_match_text(b.name) LIKE '%' || normalize_award_match_text(s.raw_name) || '%'
       OR normalize_award_match_text(s.raw_name) LIKE '%' || normalize_award_match_text(b.name) || '%'
     )
)
UPDATE business_awards_import_staging s
SET matched_business_id = cm.business_id,
    match_strategy = cm.strategy,
    match_confidence = cm.confidence,
    linked_at = NOW()
FROM candidate_matches cm
WHERE s.id = cm.staging_id
  AND cm.rn = 1
  AND cm.confidence >= 90;

-- ------------------------------------------------
-- 5. Insertar premios finales solo si ya hay negocio vinculado
-- ------------------------------------------------
INSERT INTO business_awards (
    business_id,
    award_source,
    award_name,
    award_year,
    award_level,
    green_award,
    first_awarded_year,
    current_award_year,
    source_url,
    last_verified_at,
    verification_status,
    badge_text,
    icon_key,
    notes
)
SELECT
    s.matched_business_id,
    'MICHELIN Guide',
    'MICHELIN Star',
    s.award_year,
    COALESCE(s.stars, 0),
    COALESCE(s.green_award, FALSE),
    s.award_year,
    s.award_year,
    s.source_url,
    NOW(),
    COALESCE(NULLIF(s.verification_status, ''), 'verified'),
    s.badge_text,
    s.icon_key,
    s.notes
FROM business_awards_import_staging s
WHERE s.matched_business_id IS NOT NULL
ON CONFLICT (business_id, award_source, award_name, award_year)
DO UPDATE SET
    award_level = EXCLUDED.award_level,
    green_award = EXCLUDED.green_award,
    current_award_year = EXCLUDED.current_award_year,
    source_url = EXCLUDED.source_url,
    last_verified_at = EXCLUDED.last_verified_at,
    verification_status = EXCLUDED.verification_status,
    badge_text = EXCLUDED.badge_text,
    icon_key = EXCLUDED.icon_key,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ------------------------------------------------
-- 6. Consultas de validacion
-- ------------------------------------------------
-- A) Conteo general
SELECT
    COUNT(*) AS total_staging,
    COUNT(*) FILTER (WHERE matched_business_id IS NOT NULL) AS matched_records,
    COUNT(*) FILTER (WHERE matched_business_id IS NULL) AS unmatched_records
FROM business_awards_import_staging;

-- B) Ver matches aplicados
SELECT
    s.raw_name,
    s.city,
    s.match_strategy,
    s.match_confidence,
    b.name AS matched_business_name,
    b.city_name AS matched_city_name,
    b.address AS matched_address
FROM business_awards_import_staging s
LEFT JOIN businesses b ON b.id = s.matched_business_id
ORDER BY s.match_confidence DESC, s.raw_name;

-- C) Ver pendientes de revision manual
SELECT
    id,
    raw_name,
    city,
    state,
    address,
    award_year,
    stars,
    green_award
FROM business_awards_import_staging
WHERE matched_business_id IS NULL
ORDER BY raw_name;

-- D) Premios ya insertados
SELECT
    ba.award_year,
    ba.award_level,
    ba.green_award,
    b.name,
    b.city_name,
    ba.badge_text
FROM business_awards ba
JOIN businesses b ON b.id = ba.business_id
WHERE ba.award_source = 'MICHELIN Guide'
ORDER BY ba.award_level DESC, b.name;

