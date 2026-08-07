-- Search international businesses on demand. Never return a full city catalog.

BEGIN;

ALTER TABLE public.international_businesses
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recommended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recommended_by UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.normalize_international_search_text(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      TRANSLATE(
        LOWER(COALESCE(input_text, '')),
        U&'\00E1\00E9\00ED\00F3\00FA\00FC\00F1\00E0\00E8\00EC\00F2\00F9\00E2\00EA\00EE\00F4\00FB\00E4\00EB\00EF\00F6\00FC\00E7',
        'aeiouunaeiouaeiouaeiouc'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

CREATE INDEX IF NOT EXISTS idx_international_businesses_search_document
  ON public.international_businesses
  USING GIN (
    TO_TSVECTOR(
      'simple',
      public.normalize_international_search_text(
        COALESCE(name, '') || ' ' ||
        COALESCE(category, '') || ' ' ||
        COALESCE(subcategory, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(address, '') || ' ' ||
        COALESCE(city, '')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_international_businesses_public_market
  ON public.international_businesses(country_code, LOWER(city), status, is_visible);

CREATE OR REPLACE FUNCTION public.search_international_businesses(
  p_query TEXT,
  p_country_code TEXT,
  p_city TEXT,
  p_category_hints TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  address TEXT,
  city TEXT,
  state_code TEXT,
  postal_code TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website TEXT,
  website_url TEXT,
  phone TEXT,
  slug TEXT,
  source_type TEXT,
  source_record_id TEXT,
  attribution_text TEXT,
  is_claimed BOOLEAN,
  is_verified BOOLEAN,
  is_recommended BOOLEAN,
  is_premium_owner BOOLEAN,
  preferred_language TEXT,
  search_rank_score DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH parameters AS (
    SELECT
      public.normalize_international_search_text(p_query) AS normalized_query,
      UPPER(TRIM(COALESCE(p_country_code, ''))) AS country_code,
      LOWER(TRIM(COALESCE(p_city, ''))) AS city_name,
      LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20) AS result_limit,
      ARRAY(
        SELECT public.normalize_international_search_text(value)
        FROM UNNEST(COALESCE(p_category_hints, ARRAY[]::TEXT[])) AS value
        WHERE LENGTH(public.normalize_international_search_text(value)) >= 3
      ) AS normalized_hints
  ),
  ranked AS (
    SELECT
      business.*,
      FALSE AS premium_owner,
      public.normalize_international_search_text(
        COALESCE(business.name, '') || ' ' ||
        COALESCE(business.category, '') || ' ' ||
        COALESCE(business.subcategory, '') || ' ' ||
        COALESCE(business.description, '') || ' ' ||
        COALESCE(business.address, '') || ' ' ||
        COALESCE(business.city, '')
      ) AS search_document,
      CASE
        WHEN p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180 THEN
          6371 * ACOS(
            LEAST(
              1,
              GREATEST(
                -1,
                COS(RADIANS(p_latitude)) * COS(RADIANS(business.latitude))
                  * COS(RADIANS(business.longitude) - RADIANS(p_longitude))
                  + SIN(RADIANS(p_latitude)) * SIN(RADIANS(business.latitude))
              )
            )
          )
        ELSE NULL
      END AS calculated_distance
    FROM public.international_businesses AS business
    CROSS JOIN parameters
    WHERE parameters.normalized_query <> ''
      AND parameters.country_code ~ '^[A-Z]{2}$'
      AND parameters.city_name <> ''
      AND business.status = 'approved'
      AND business.is_visible = TRUE
      AND business.country_code = parameters.country_code
      AND LOWER(business.city) = parameters.city_name
  ),
  relevant AS (
    SELECT
      ranked.*,
      CASE
        WHEN ranked.search_document LIKE '%' || parameters.normalized_query || '%' THEN 100
        WHEN TO_TSVECTOR('simple', ranked.search_document)
          @@ WEBSEARCH_TO_TSQUERY('simple', parameters.normalized_query) THEN 90
        WHEN EXISTS (
          SELECT 1
          FROM UNNEST(parameters.normalized_hints) AS hint
          WHERE ranked.search_document LIKE '%' || hint || '%'
        ) THEN 80
        ELSE 50
      END::DOUBLE PRECISION AS relevance_score
    FROM ranked
    CROSS JOIN parameters
    WHERE ranked.search_document LIKE '%' || parameters.normalized_query || '%'
      OR TO_TSVECTOR('simple', ranked.search_document)
        @@ WEBSEARCH_TO_TSQUERY('simple', parameters.normalized_query)
      OR EXISTS (
        SELECT 1
        FROM UNNEST(parameters.normalized_hints) AS hint
        WHERE ranked.search_document LIKE '%' || hint || '%'
      )
      OR EXISTS (
        SELECT 1
        FROM REGEXP_SPLIT_TO_TABLE(parameters.normalized_query, '\s+') AS token
        WHERE LENGTH(token) >= 4
          AND ranked.search_document LIKE '%' || token || '%'
      )
  )
  SELECT
    relevant.id,
    relevant.owner_id,
    relevant.name,
    relevant.description,
    relevant.category,
    relevant.subcategory,
    relevant.address,
    relevant.city,
    relevant.state_code,
    relevant.postal_code,
    relevant.country_code,
    relevant.latitude,
    relevant.longitude,
    relevant.website,
    relevant.website_url,
    relevant.phone,
    relevant.slug,
    relevant.source_type,
    relevant.source_record_id,
    relevant.attribution_text,
    relevant.is_claimed,
    relevant.is_verified,
    relevant.is_recommended,
    relevant.premium_owner AS is_premium_owner,
    relevant.preferred_language,
    relevant.relevance_score
      + CASE WHEN relevant.is_recommended THEN 4 ELSE 0 END
      + CASE WHEN relevant.premium_owner THEN 2 ELSE 0 END AS search_rank_score,
    relevant.calculated_distance AS distance_km
  FROM relevant
  CROSS JOIN parameters
  ORDER BY
    relevant.relevance_score DESC,
    relevant.is_recommended DESC,
    relevant.premium_owner DESC,
    relevant.calculated_distance ASC NULLS LAST,
    relevant.name ASC
  LIMIT (SELECT result_limit FROM parameters);
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'user_profiles') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.search_international_businesses(
      p_query TEXT,
      p_country_code TEXT,
      p_city TEXT,
      p_category_hints TEXT[] DEFAULT ARRAY[]::TEXT[],
      p_latitude DOUBLE PRECISION DEFAULT NULL,
      p_longitude DOUBLE PRECISION DEFAULT NULL,
      p_limit INTEGER DEFAULT 20
    )
    RETURNS TABLE (
      id UUID,
      owner_id UUID,
      name TEXT,
      description TEXT,
      category TEXT,
      subcategory TEXT,
      address TEXT,
      city TEXT,
      state_code TEXT,
      postal_code TEXT,
      country_code TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      website TEXT,
      website_url TEXT,
      phone TEXT,
      slug TEXT,
      source_type TEXT,
      source_record_id TEXT,
      attribution_text TEXT,
      is_claimed BOOLEAN,
      is_verified BOOLEAN,
      is_recommended BOOLEAN,
      is_premium_owner BOOLEAN,
      preferred_language TEXT,
      search_rank_score DOUBLE PRECISION,
      distance_km DOUBLE PRECISION
    )
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $f$
      WITH parameters AS (
        SELECT
          public.normalize_international_search_text(p_query) AS normalized_query,
          UPPER(TRIM(COALESCE(p_country_code, ''''))) AS country_code,
          LOWER(TRIM(COALESCE(p_city, ''''))) AS city_name,
          LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20) AS result_limit,
          ARRAY(
            SELECT public.normalize_international_search_text(value)
            FROM UNNEST(COALESCE(p_category_hints, ARRAY[]::TEXT[])) AS value
            WHERE LENGTH(public.normalize_international_search_text(value)) >= 3
          ) AS normalized_hints
      ),
      ranked AS (
        SELECT
          business.*,
          COALESCE(profile.is_premium, FALSE) AS premium_owner,
          public.normalize_international_search_text(
            COALESCE(business.name, '''') || '' '' ||
            COALESCE(business.category, '''') || '' '' ||
            COALESCE(business.subcategory, '''') || '' '' ||
            COALESCE(business.description, '''') || '' '' ||
            COALESCE(business.address, '''') || '' '' ||
            COALESCE(business.city, '''')
          ) AS search_document,
          CASE
            WHEN p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180 THEN
              6371 * ACOS(
                LEAST(
                  1,
                  GREATEST(
                    -1,
                    COS(RADIANS(p_latitude)) * COS(RADIANS(business.latitude))
                      * COS(RADIANS(business.longitude) - RADIANS(p_longitude))
                      + SIN(RADIANS(p_latitude)) * SIN(RADIANS(business.latitude))
                  )
                )
              )
            ELSE NULL
          END AS calculated_distance
        FROM public.international_businesses AS business
        CROSS JOIN parameters
        LEFT JOIN public.user_profiles AS profile
          ON profile.id = COALESCE(business.claimed_by, business.owner_id)
        WHERE parameters.normalized_query <> ''''''
          AND parameters.country_code ~ ''^[A-Z]{2}$''
          AND parameters.city_name <> ''''''
          AND business.status = ''approved''
          AND business.is_visible = TRUE
          AND business.country_code = parameters.country_code
          AND LOWER(business.city) = parameters.city_name
      ),
      relevant AS (
        SELECT
          ranked.*,
          CASE
            WHEN ranked.search_document LIKE ''%'' || parameters.normalized_query || ''%'' THEN 100
            WHEN TO_TSVECTOR(''simple'', ranked.search_document)
              @@ WEBSEARCH_TO_TSQUERY(''simple'', parameters.normalized_query) THEN 90
            WHEN EXISTS (
              SELECT 1
              FROM UNNEST(parameters.normalized_hints) AS hint
              WHERE ranked.search_document LIKE ''%'' || hint || ''%''
            ) THEN 80
            ELSE 50
          END::DOUBLE PRECISION AS relevance_score
        FROM ranked
        CROSS JOIN parameters
        WHERE ranked.search_document LIKE ''%'' || parameters.normalized_query || ''%''
          OR TO_TSVECTOR(''simple'', ranked.search_document)
            @@ WEBSEARCH_TO_TSQUERY(''simple'', parameters.normalized_query)
          OR EXISTS (
            SELECT 1
            FROM UNNEST(parameters.normalized_hints) AS hint
            WHERE ranked.search_document LIKE ''%'' || hint || ''%''
          )
          OR EXISTS (
            SELECT 1
            FROM REGEXP_SPLIT_TO_TABLE(parameters.normalized_query, ''\s+'') AS token
            WHERE LENGTH(token) >= 4
              AND ranked.search_document LIKE ''%'' || token || ''%''
          )
      )
      SELECT
        relevant.id,
        relevant.owner_id,
        relevant.name,
        relevant.description,
        relevant.category,
        relevant.subcategory,
        relevant.address,
        relevant.city,
        relevant.state_code,
        relevant.postal_code,
        relevant.country_code,
        relevant.latitude,
        relevant.longitude,
        relevant.website,
        relevant.website_url,
        relevant.phone,
        relevant.slug,
        relevant.source_type,
        relevant.source_record_id,
        relevant.attribution_text,
        relevant.is_claimed,
        relevant.is_verified,
        relevant.is_recommended,
        relevant.premium_owner AS is_premium_owner,
        relevant.preferred_language,
        relevant.relevance_score
          + CASE WHEN relevant.is_recommended THEN 4 ELSE 0 END
          + CASE WHEN relevant.premium_owner THEN 2 ELSE 0 END AS search_rank_score,
        relevant.calculated_distance AS distance_km
      FROM relevant
      CROSS JOIN parameters
      ORDER BY
        relevant.relevance_score DESC,
        relevant.is_recommended DESC,
        relevant.premium_owner DESC,
        relevant.calculated_distance ASC NULLS LAST,
        relevant.name ASC
      LIMIT (SELECT result_limit FROM parameters);
    $f$';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.search_international_businesses(
  TEXT, TEXT, TEXT, TEXT[], DOUBLE PRECISION, DOUBLE PRECISION, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_international_businesses(
  TEXT, TEXT, TEXT, TEXT[], DOUBLE PRECISION, DOUBLE PRECISION, INTEGER
) TO anon, authenticated;

COMMIT;
