-- Read-only QA report for Wave 6. This script does not publish or modify data.

WITH wave6_markets(country_code, city_name) AS (
  VALUES
    ('SG', 'Singapore'),
    ('KR', 'Seoul'),
    ('AE', 'Dubai'),
    ('SE', 'Stockholm'),
    ('AT', 'Vienna'),
    ('BE', 'Brussels')
),
market_rows AS (
  SELECT
    business.country_code,
    business.city,
    business.name,
    business.address,
    business.latitude,
    business.longitude,
    business.category,
    business.subcategory,
    business.is_visible,
    COUNT(*) OVER (
      PARTITION BY
        business.country_code,
        LOWER(business.city),
        LOWER(business.name),
        LOWER(COALESCE(business.address, '')),
        ROUND(business.latitude::NUMERIC, 5),
        ROUND(business.longitude::NUMERIC, 5)
    ) AS duplicate_group_size
  FROM public.international_businesses AS business
  JOIN wave6_markets AS market
    ON market.country_code = business.country_code
   AND LOWER(market.city_name) = LOWER(business.city)
  WHERE business.source_type = 'seed_overture'
)
SELECT
  country_code,
  city,
  COUNT(*) AS imported_records,
  COUNT(*) FILTER (WHERE is_visible) AS visible_records,
  ROUND(100.0 * COUNT(*) FILTER (WHERE duplicate_group_size > 1) / NULLIF(COUNT(*), 0), 2) AS duplicate_percent,
  ROUND(100.0 * COUNT(*) FILTER (
    WHERE latitude NOT BETWEEN -90 AND 90 OR longitude NOT BETWEEN -180 AND 180
  ) / NULLIF(COUNT(*), 0), 2) AS invalid_coordinate_percent,
  COUNT(DISTINCT category) AS category_count,
  COUNT(DISTINCT subcategory) AS subcategory_count
FROM market_rows
GROUP BY country_code, city
ORDER BY country_code, city;

-- Random sample for manual verification. Change the country/city for each review.
SELECT
  name, category, subcategory, address, city, country_code,
  latitude, longitude, website, phone, source_record_id
FROM public.international_businesses
WHERE country_code = 'SG'
  AND LOWER(city) = 'singapore'
  AND source_type = 'seed_overture'
ORDER BY RANDOM()
LIMIT 100;
