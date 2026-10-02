-- Read-only inventory for GeoScore Phase 3 first-party business metrics.
-- This does not mutate data. It checks which geography/category fields exist
-- and whether there is enough located business data to build aggregate metrics.

WITH wanted_columns(column_name) AS (
  VALUES
    ('id'),
    ('name'),
    ('category'),
    ('subcategory'),
    ('business_type'),
    ('status'),
    ('business_status'),
    ('is_visible'),
    ('is_verified'),
    ('is_claimed'),
    ('source_type'),
    ('latitude'),
    ('longitude'),
    ('location'),
    ('geog'),
    ('country_code'),
    ('city'),
    ('city_name'),
    ('state_code')
),
column_inventory AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'column_name', wanted_columns.column_name,
      'data_type', columns.data_type,
      'udt_schema', columns.udt_schema,
      'udt_name', columns.udt_name,
      'is_nullable', columns.is_nullable,
      'exists', columns.column_name IS NOT NULL
    )
    ORDER BY wanted_columns.column_name
  ) AS payload
  FROM wanted_columns
  LEFT JOIN information_schema.columns columns
    ON columns.table_schema = 'public'
   AND columns.table_name = 'businesses'
   AND columns.column_name = wanted_columns.column_name
),
row_counts AS (
  SELECT jsonb_build_object(
    'total_businesses', COUNT(*),
    'businesses_with_lat_lng', COUNT(*) FILTER (
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
    ),
    'mx_businesses', COUNT(*) FILTER (
      WHERE country_code = 'MX'
    ),
    'mx_businesses_with_lat_lng', COUNT(*) FILTER (
      WHERE country_code = 'MX'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    )
  ) AS payload
  FROM public.businesses
),
top_segments AS (
  SELECT jsonb_agg(row_to_json(segment_rows)::jsonb ORDER BY business_count DESC) AS payload
  FROM (
    SELECT
      COALESCE(category, 'unknown') AS category,
      COALESCE(subcategory, 'unknown') AS subcategory,
      COALESCE(source_type, 'unknown') AS source_type,
      COUNT(*) AS business_count
    FROM public.businesses
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
    GROUP BY
      COALESCE(category, 'unknown'),
      COALESCE(subcategory, 'unknown'),
      COALESCE(source_type, 'unknown')
    ORDER BY business_count DESC
    LIMIT 30
  ) segment_rows
)
SELECT jsonb_pretty(jsonb_build_object(
  'columns', column_inventory.payload,
  'row_counts', row_counts.payload,
  'top_segments', COALESCE(top_segments.payload, '[]'::jsonb)
)) AS geoscore_business_inventory
FROM column_inventory, row_counts, top_segments;
