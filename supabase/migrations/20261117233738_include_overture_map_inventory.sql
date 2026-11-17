-- Include public Overture inventory in the same bounded map RPC.
-- Version matches the applied Geobooker migration history.
-- Keep DENUE in business_candidates to avoid importing its second copy twice.
BEGIN;
CREATE OR REPLACE FUNCTION public.businesses_in_bounds(
  west double precision, south double precision, east double precision, north double precision,
  p_category text DEFAULT NULL, p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid, name text, slug text, category text, city_name text,
  lat double precision, lng double precision, is_claimed boolean,
  is_verified boolean, source_type text, address text, phone text
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
SET statement_timeout = '8s'
AS $function$
  (
    SELECT b.id,b.name,b.slug,b.category,b.city_name,b.latitude AS lat,b.longitude AS lng,
      coalesce(b.is_claimed,false) AS is_claimed,coalesce(b.is_verified,false) AS is_verified,
      coalesce(b.source_type,'native') AS source_type,b.address,b.phone
    FROM public.businesses b
    WHERE b.status='approved' AND coalesce(b.is_visible,true)
      AND coalesce(b.business_status,'active')='active'
      AND (p_category IS NULL OR b.category=p_category)
      AND b.latitude BETWEEN south AND north AND b.longitude BETWEEN west AND east
    LIMIT 100
  )
  UNION ALL
  (
    SELECT c.id,c.name,c.slug,c.category_normalized,c.city_name,c.lat,c.lng,
      false,false,coalesce(c.source_type,'seed_denue'),c.address_line,c.phone
    FROM public.business_candidates c
    WHERE c.moderation_status='pending'
      AND (p_category IS NULL OR c.category_normalized=p_category)
      AND c.lat BETWEEN south AND north AND c.lng BETWEEN west AND east
    LIMIT greatest(1,least(p_limit,500))
  )
  UNION ALL
  (
    SELECT i.id,i.name,i.slug,i.category,i.city,i.latitude,i.longitude,
      coalesce(i.is_claimed,false),coalesce(i.is_verified,false),i.source_type,i.address,i.phone
    FROM public.international_businesses i
    WHERE i.source_type='seed_overture' AND i.status='approved' AND i.is_visible
      AND coalesce(i.business_status,'active')='active'
      AND (p_category IS NULL OR i.category=p_category)
      AND i.latitude BETWEEN south AND north AND i.longitude BETWEEN west AND east
    LIMIT greatest(1,least(p_limit,500))
  )
  ORDER BY is_verified DESC,is_claimed DESC,name ASC
  LIMIT greatest(1,least(p_limit,500));
$function$;
NOTIFY pgrst,'reload schema';
COMMIT;
