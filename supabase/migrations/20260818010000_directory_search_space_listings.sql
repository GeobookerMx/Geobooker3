-- MVP: resilient directory search plus safe publication of rental spaces.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    ALTER TABLE public.businesses
      ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'business',
      ADD COLUMN IF NOT EXISTS space_type TEXT,
      ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS rent_currency TEXT,
      ADD COLUMN IF NOT EXISTS area_sqm NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS available_from DATE;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'businesses_listing_type_check'
        AND conrelid = 'public.businesses'::regclass
    ) THEN
      ALTER TABLE public.businesses
        ADD CONSTRAINT businesses_listing_type_check
        CHECK (listing_type IN ('business', 'space_rental'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'businesses_monthly_rent_check'
        AND conrelid = 'public.businesses'::regclass
    ) THEN
      ALTER TABLE public.businesses
        ADD CONSTRAINT businesses_monthly_rent_check
        CHECK (monthly_rent IS NULL OR monthly_rent >= 0);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_businesses_listing_type_status
      ON public.businesses(listing_type, status, is_visible);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'space-listing-images',
  'space-listing-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS space_listing_images_public_read_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_insert_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_update_v1 ON storage.objects;
DROP POLICY IF EXISTS space_listing_images_owner_delete_v1 ON storage.objects;

CREATE POLICY space_listing_images_public_read_v1
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'space-listing-images');

CREATE POLICY space_listing_images_owner_insert_v1
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY space_listing_images_owner_update_v1
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY space_listing_images_owner_delete_v1
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'space-listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE OR REPLACE FUNCTION public.search_business_directory(
  p_query TEXT,
  p_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_country_code TEXT DEFAULT 'MX',
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 75,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  category TEXT,
  subcategory TEXT,
  city TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  source_type TEXT,
  is_claimed BOOLEAN,
  is_verified BOOLEAN,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_terms TEXT[];
  v_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 20), 20));
BEGIN
  IF to_regclass('public.business_candidates') IS NULL THEN
    RETURN;
  END IF;

  SELECT ARRAY_AGG(DISTINCT LOWER(TRIM(term)))
  INTO v_terms
  FROM unnest(ARRAY_APPEND(COALESCE(p_terms, ARRAY[]::TEXT[]), COALESCE(p_query, ''))) AS term
  WHERE LENGTH(TRIM(term)) >= 3;

  IF COALESCE(array_length(v_terms, 1), 0) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $directory$
    SELECT
      c.id,
      c.name,
      c.slug,
      COALESCE(c.category_normalized, 'servicios') AS category,
      COALESCE(c.subcategory, c.category_raw) AS subcategory,
      c.city_name AS city,
      c.address_line AS address,
      c.lat AS latitude,
      c.lng AS longitude,
      c.phone,
      c.website,
      COALESCE(c.source_type, 'seed_denue') AS source_type,
      FALSE AS is_claimed,
      FALSE AS is_verified,
      CASE
        WHEN $2 IS NULL OR $3 IS NULL THEN NULL
        ELSE 111.195 * SQRT(
          POWER(c.lat - $2, 2) +
          POWER((c.lng - $3) * COS(RADIANS($2)), 2)
        )
      END AS distance_km
    FROM public.business_candidates c
    WHERE c.moderation_status IN ('pending', 'approved')
      AND c.lat IS NOT NULL
      AND c.lng IS NOT NULL
      AND ($4 IS NULL OR UPPER(c.country_code) = UPPER($4))
      AND EXISTS (
        SELECT 1
        FROM unnest($1::TEXT[]) AS term
        WHERE CONCAT_WS(' ', c.name, c.category_raw, c.category_normalized, c.subcategory, c.city_name)
          ILIKE '%' || term || '%'
      )
      AND (
        $2 IS NULL OR $3 IS NULL OR
        111.195 * SQRT(
          POWER(c.lat - $2, 2) +
          POWER((c.lng - $3) * COS(RADIANS($2)), 2)
        ) <= GREATEST(1, LEAST(COALESCE($5, 75), 250))
      )
    ORDER BY distance_km ASC NULLS LAST, c.confidence_score DESC NULLS LAST, c.name ASC
    LIMIT $6
  $directory$
  USING v_terms, p_latitude, p_longitude, NULLIF(TRIM(p_country_code), ''), p_radius_km, v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_business_directory(TEXT, TEXT[], TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_business_directory(TEXT, TEXT[], TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon, authenticated;

COMMIT;
