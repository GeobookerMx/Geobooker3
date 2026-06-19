-- ================================================================
-- VISTAS / HELPERS PARA REVISAR MATCHES MICHELIN
-- Ejecutar despues de:
-- - create_business_awards_system.sql
-- - seed_michelin_mexico_2026_staging.sql
-- - link_michelin_staging_to_business_awards.sql
-- ================================================================

CREATE OR REPLACE VIEW vw_michelin_staging_match_status AS
SELECT
    s.id,
    s.raw_name,
    s.city,
    s.state,
    s.address,
    s.award_year,
    s.stars,
    s.green_award,
    s.matched_business_id,
    s.match_strategy,
    s.match_confidence,
    b.name AS matched_business_name,
    b.city_name AS matched_city_name,
    b.address AS matched_business_address,
    b.latitude,
    b.longitude
FROM business_awards_import_staging s
LEFT JOIN businesses b ON b.id = s.matched_business_id
ORDER BY s.match_confidence DESC NULLS LAST, s.raw_name;

CREATE OR REPLACE VIEW vw_michelin_staging_unmatched AS
SELECT
    s.id,
    s.raw_name,
    s.city,
    s.state,
    s.address,
    s.award_year,
    s.stars,
    s.green_award,
    s.badge_text
FROM business_awards_import_staging s
WHERE s.matched_business_id IS NULL
ORDER BY s.raw_name;

CREATE OR REPLACE VIEW vw_michelin_staging_possible_candidates AS
SELECT
    s.id AS staging_id,
    s.raw_name,
    s.city,
    b.id AS business_id,
    b.name AS business_name,
    b.city_name,
    b.address,
    CASE
        WHEN LOWER(b.name) = LOWER(s.raw_name) THEN 100
        WHEN LOWER(b.name) LIKE '%' || LOWER(s.raw_name) || '%' THEN 85
        WHEN LOWER(s.raw_name) LIKE '%' || LOWER(b.name) || '%' THEN 82
        ELSE 0
    END AS suggested_confidence
FROM business_awards_import_staging s
JOIN businesses b
  ON (
      LOWER(b.name) = LOWER(s.raw_name)
   OR LOWER(b.name) LIKE '%' || LOWER(s.raw_name) || '%'
   OR LOWER(s.raw_name) LIKE '%' || LOWER(b.name) || '%'
  )
WHERE s.matched_business_id IS NULL
  AND b.status = 'approved'
  AND COALESCE(b.is_visible, TRUE) = TRUE
ORDER BY s.raw_name, suggested_confidence DESC, b.updated_at DESC NULLS LAST;

-- Consulta rapida de resumen
SELECT
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE matched_business_id IS NOT NULL) AS linked_rows,
    COUNT(*) FILTER (WHERE matched_business_id IS NULL) AS pending_rows
FROM vw_michelin_staging_match_status;

