-- Geobooker commercial spaces MVP.
-- Discovery and lead generation only: no booking, rent collection, deposits or escrow.

CREATE TABLE IF NOT EXISTS public.commercial_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 8 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 40 AND 4000),
  space_type TEXT NOT NULL CHECK (space_type IN (
    'retail', 'office', 'consulting_room', 'warehouse', 'commercial_land', 'event_space', 'pop_up'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'documents_required', 'published', 'paused', 'rented', 'rejected', 'archived'
  )),
  public_location TEXT NOT NULL CHECK (char_length(public_location) BETWEEN 2 AND 140),
  address_private TEXT NOT NULL CHECK (char_length(address_private) BETWEEN 8 AND 300),
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 100),
  state_region TEXT,
  country_code TEXT NOT NULL DEFAULT 'MX' CHECK (country_code ~ '^[A-Z]{2}$'),
  postal_code TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  area_sqm NUMERIC(12,2) NOT NULL CHECK (area_sqm > 0 AND area_sqm <= 10000000),
  monthly_rent NUMERIC(14,2) CHECK (monthly_rent IS NULL OR monthly_rent >= 0),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency ~ '^[A-Z]{3}$'),
  available_from DATE,
  parking_spaces INTEGER NOT NULL DEFAULT 0 CHECK (parking_spaces BETWEEN 0 AND 10000),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  permitted_uses TEXT[] NOT NULL DEFAULT '{}',
  restrictions TEXT,
  contact_name TEXT NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 120),
  contact_email TEXT NOT NULL CHECK (char_length(contact_email) BETWEEN 5 AND 254),
  contact_phone TEXT,
  cover_image_url TEXT,
  is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_authority_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_location_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_notes TEXT,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commercial_space_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.commercial_spaces(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 100),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, storage_path)
);

CREATE TABLE IF NOT EXISTS public.commercial_space_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.commercial_spaces(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'identity', 'ownership', 'listing_authority', 'tax_record', 'operating_permission', 'other'
  )),
  storage_path TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at DATE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, document_type, storage_path)
);

CREATE TABLE IF NOT EXISTS public.commercial_space_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.commercial_spaces(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL CHECK (char_length(requester_email) BETWEEN 5 AND 254),
  requester_name TEXT CHECK (requester_name IS NULL OR char_length(requester_name) BETWEEN 2 AND 120),
  inquiry_type TEXT NOT NULL DEFAULT 'information' CHECK (inquiry_type IN ('information', 'visit', 'proposal')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 20 AND 1500),
  desired_start_date DATE,
  budget_amount NUMERIC(14,2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visit_scheduled', 'closed', 'spam')),
  owner_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commercial_space_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.commercial_spaces(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_spaces_public_search_idx
  ON public.commercial_spaces (status, country_code, city, space_type, monthly_rent);
CREATE INDEX IF NOT EXISTS commercial_spaces_owner_idx ON public.commercial_spaces (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS commercial_spaces_location_idx ON public.commercial_spaces (latitude, longitude);
CREATE INDEX IF NOT EXISTS commercial_space_inquiries_space_idx
  ON public.commercial_space_inquiries (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commercial_space_inquiries_requester_idx
  ON public.commercial_space_inquiries (requester_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_commercial_spaces_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_users admin_user WHERE admin_user.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_commercial_spaces_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_commercial_spaces_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_commercial_space_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_is_admin BOOLEAN := public.is_commercial_spaces_admin();
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' THEN
    IF NOT actor_is_admin THEN
      NEW.owner_id := auth.uid();
      NEW.status := CASE WHEN NEW.status = 'pending_review' THEN 'pending_review' ELSE 'draft' END;
      NEW.is_identity_verified := FALSE;
      NEW.is_authority_verified := FALSE;
      NEW.is_location_verified := FALSE;
      NEW.reviewed_at := NULL;
      NEW.reviewed_by := NULL;
      NEW.published_at := NULL;
      IF NEW.status = 'pending_review' THEN NEW.submitted_at := now(); END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT actor_is_admin THEN
    IF OLD.owner_id <> auth.uid() OR NEW.owner_id <> OLD.owner_id THEN
      RAISE EXCEPTION 'space_owner_required' USING ERRCODE = '42501';
    END IF;
    NEW.is_identity_verified := OLD.is_identity_verified;
    NEW.is_authority_verified := OLD.is_authority_verified;
    NEW.is_location_verified := OLD.is_location_verified;
    NEW.verification_notes := OLD.verification_notes;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.published_at := OLD.published_at;

    IF NEW.status NOT IN ('draft', 'pending_review', 'paused', 'rented', 'archived') THEN
      RAISE EXCEPTION 'invalid_owner_status_transition' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'published' AND ROW(NEW.title, NEW.description, NEW.address_private, NEW.latitude, NEW.longitude,
      NEW.area_sqm, NEW.monthly_rent, NEW.permitted_uses, NEW.restrictions)
      IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.address_private, OLD.latitude, OLD.longitude,
      OLD.area_sqm, OLD.monthly_rent, OLD.permitted_uses, OLD.restrictions) THEN
      NEW.status := 'pending_review';
      NEW.submitted_at := now();
    ELSIF NEW.status = 'pending_review' AND OLD.status <> 'pending_review' THEN
      NEW.submitted_at := now();
    END IF;
  ELSE
    IF NEW.status = 'published' AND (NOT NEW.is_authority_verified OR NOT NEW.is_location_verified) THEN
      RAISE EXCEPTION 'required_verifications_missing' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'published' AND OLD.status <> 'published' THEN
      NEW.published_at := now();
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_commercial_space_workflow_trigger ON public.commercial_spaces;
CREATE TRIGGER protect_commercial_space_workflow_trigger
BEFORE INSERT OR UPDATE ON public.commercial_spaces
FOR EACH ROW EXECUTE FUNCTION public.protect_commercial_space_workflow();

CREATE OR REPLACE FUNCTION public.log_commercial_space_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.commercial_space_status_history (space_id, previous_status, new_status, actor_id)
    VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_commercial_space_status_trigger ON public.commercial_spaces;
CREATE TRIGGER log_commercial_space_status_trigger
AFTER INSERT OR UPDATE OF status ON public.commercial_spaces
FOR EACH ROW EXECUTE FUNCTION public.log_commercial_space_status();

CREATE OR REPLACE FUNCTION public.protect_commercial_space_inquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_is_admin BOOLEAN := public.is_commercial_spaces_admin();
  actor_is_owner BOOLEAN;
  recent_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'inquiry_requester_required' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO recent_count
    FROM public.commercial_space_inquiries inquiry
    WHERE inquiry.requester_id = auth.uid() AND inquiry.created_at > now() - interval '1 hour';
    IF recent_count >= 5 THEN
      RAISE EXCEPTION 'inquiry_rate_limit_exceeded' USING ERRCODE = 'P0001';
    END IF;
    SELECT account.email, NULLIF(trim(account.raw_user_meta_data ->> 'full_name'), '')
      INTO NEW.requester_email, NEW.requester_name
    FROM auth.users account
    WHERE account.id = auth.uid();
    IF NEW.requester_email IS NULL THEN
      RAISE EXCEPTION 'verified_email_required' USING ERRCODE = '23514';
    END IF;
    NEW.status := 'new';
    NEW.owner_notes := NULL;
    RETURN NEW;
  END IF;

  IF actor_is_admin THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.commercial_spaces space
    WHERE space.id = OLD.space_id AND space.owner_id = auth.uid()
  ) INTO actor_is_owner;
  IF NOT actor_is_owner THEN
    RAISE EXCEPTION 'space_owner_required' USING ERRCODE = '42501';
  END IF;

  NEW.id := OLD.id;
  NEW.space_id := OLD.space_id;
  NEW.requester_id := OLD.requester_id;
  NEW.requester_email := OLD.requester_email;
  NEW.requester_name := OLD.requester_name;
  NEW.inquiry_type := OLD.inquiry_type;
  NEW.message := OLD.message;
  NEW.desired_start_date := OLD.desired_start_date;
  NEW.budget_amount := OLD.budget_amount;
  NEW.currency := OLD.currency;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_commercial_space_inquiry_trigger ON public.commercial_space_inquiries;
CREATE TRIGGER protect_commercial_space_inquiry_trigger
BEFORE INSERT OR UPDATE ON public.commercial_space_inquiries
FOR EACH ROW EXECUTE FUNCTION public.protect_commercial_space_inquiry();

REVOKE ALL ON FUNCTION public.protect_commercial_space_workflow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_commercial_space_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_commercial_space_inquiry() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.commercial_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_spaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_space_status_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commercial_spaces_owner_select ON public.commercial_spaces;
CREATE POLICY commercial_spaces_owner_select ON public.commercial_spaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_commercial_spaces_admin());
DROP POLICY IF EXISTS commercial_spaces_owner_insert ON public.commercial_spaces;
CREATE POLICY commercial_spaces_owner_insert ON public.commercial_spaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_commercial_spaces_admin());
DROP POLICY IF EXISTS commercial_spaces_owner_update ON public.commercial_spaces;
CREATE POLICY commercial_spaces_owner_update ON public.commercial_spaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_commercial_spaces_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_commercial_spaces_admin());

DROP POLICY IF EXISTS commercial_space_photos_owner_all ON public.commercial_space_photos;
CREATE POLICY commercial_space_photos_owner_all ON public.commercial_space_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id
    AND (space.owner_id = auth.uid() OR public.is_commercial_spaces_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id
    AND (space.owner_id = auth.uid() OR public.is_commercial_spaces_admin())));

DROP POLICY IF EXISTS commercial_space_documents_owner_all ON public.commercial_space_documents;
CREATE POLICY commercial_space_documents_owner_all ON public.commercial_space_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id
    AND (space.owner_id = auth.uid() OR public.is_commercial_spaces_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id
    AND (space.owner_id = auth.uid() OR public.is_commercial_spaces_admin())));

DROP POLICY IF EXISTS commercial_space_inquiries_participant_select ON public.commercial_space_inquiries;
CREATE POLICY commercial_space_inquiries_participant_select ON public.commercial_space_inquiries FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_commercial_spaces_admin() OR EXISTS (
    SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id AND space.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS commercial_space_inquiries_requester_insert ON public.commercial_space_inquiries;
CREATE POLICY commercial_space_inquiries_requester_insert ON public.commercial_space_inquiries FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id
      AND space.status = 'published' AND space.owner_id <> auth.uid()
  ));
DROP POLICY IF EXISTS commercial_space_inquiries_owner_update ON public.commercial_space_inquiries;
CREATE POLICY commercial_space_inquiries_owner_update ON public.commercial_space_inquiries FOR UPDATE TO authenticated
  USING (public.is_commercial_spaces_admin() OR EXISTS (
    SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id AND space.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS commercial_space_status_history_participant_select ON public.commercial_space_status_history;
CREATE POLICY commercial_space_status_history_participant_select ON public.commercial_space_status_history FOR SELECT TO authenticated
  USING (public.is_commercial_spaces_admin() OR EXISTS (
    SELECT 1 FROM public.commercial_spaces space WHERE space.id = space_id AND space.owner_id = auth.uid()
  ));

REVOKE ALL ON public.commercial_spaces, public.commercial_space_photos,
  public.commercial_space_documents, public.commercial_space_inquiries,
  public.commercial_space_status_history FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.commercial_spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_space_photos, public.commercial_space_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commercial_space_inquiries TO authenticated;
GRANT SELECT ON public.commercial_space_status_history TO authenticated;
GRANT ALL ON public.commercial_spaces, public.commercial_space_photos,
  public.commercial_space_documents, public.commercial_space_inquiries,
  public.commercial_space_status_history TO service_role;

CREATE OR REPLACE FUNCTION public.search_commercial_spaces(
  p_query TEXT DEFAULT NULL,
  p_space_type TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_max_monthly_rent NUMERIC DEFAULT NULL,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, description TEXT, space_type TEXT,
  public_location TEXT, city TEXT, state_region TEXT, country_code TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, area_sqm NUMERIC,
  monthly_rent NUMERIC, currency TEXT, available_from DATE, parking_spaces INTEGER,
  amenities TEXT[], permitted_uses TEXT[], cover_image_url TEXT,
  is_identity_verified BOOLEAN, is_authority_verified BOOLEAN, is_location_verified BOOLEAN,
  approximate_distance_km DOUBLE PRECISION, total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH eligible AS (
    SELECT space.*,
      CASE WHEN p_user_lat IS NULL OR p_user_lng IS NULL THEN NULL
        ELSE 6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(p_user_lat)) * cos(radians(space.latitude))
          * cos(radians(space.longitude) - radians(p_user_lng))
          + sin(radians(p_user_lat)) * sin(radians(space.latitude))
        ))) END AS distance_km
    FROM public.commercial_spaces space
    WHERE space.status = 'published'
      AND (p_space_type IS NULL OR space.space_type = p_space_type)
      AND (p_city IS NULL OR lower(space.city) = lower(trim(p_city)))
      AND (p_max_monthly_rent IS NULL OR space.monthly_rent <= p_max_monthly_rent)
      AND (p_query IS NULL OR length(trim(p_query)) = 0
        OR strpos(lower(space.title || ' ' || space.description || ' ' || space.public_location || ' '
          || array_to_string(space.amenities, ' ') || ' ' || array_to_string(space.permitted_uses, ' ')),
          lower(left(trim(p_query), 100))) > 0)
  )
  SELECT eligible.id, eligible.slug, eligible.title, left(eligible.description, 500), eligible.space_type,
    eligible.public_location, eligible.city, eligible.state_region, eligible.country_code,
    round(eligible.latitude::numeric, 2)::double precision,
    round(eligible.longitude::numeric, 2)::double precision,
    eligible.area_sqm, eligible.monthly_rent, eligible.currency, eligible.available_from,
    eligible.parking_spaces, eligible.amenities, eligible.permitted_uses, eligible.cover_image_url,
    eligible.is_identity_verified, eligible.is_authority_verified, eligible.is_location_verified,
    round(eligible.distance_km::numeric, 1)::double precision, count(*) OVER ()
  FROM eligible
  ORDER BY eligible.is_authority_verified DESC, eligible.is_location_verified DESC,
    eligible.distance_km ASC NULLS LAST, eligible.published_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50) OFFSET LEAST(GREATEST(p_offset, 0), 10000);
$$;

CREATE OR REPLACE FUNCTION public.get_commercial_space(p_slug TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, description TEXT, space_type TEXT,
  public_location TEXT, city TEXT, state_region TEXT, country_code TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, area_sqm NUMERIC,
  monthly_rent NUMERIC, currency TEXT, available_from DATE, parking_spaces INTEGER,
  amenities TEXT[], permitted_uses TEXT[], restrictions TEXT, cover_image_url TEXT,
  is_identity_verified BOOLEAN, is_authority_verified BOOLEAN, is_location_verified BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT space.id, space.slug, space.title, space.description, space.space_type,
    space.public_location, space.city, space.state_region, space.country_code,
    round(space.latitude::numeric, 2)::double precision,
    round(space.longitude::numeric, 2)::double precision,
    space.area_sqm, space.monthly_rent, space.currency, space.available_from,
    space.parking_spaces, space.amenities, space.permitted_uses, space.restrictions,
    space.cover_image_url, space.is_identity_verified, space.is_authority_verified,
    space.is_location_verified
  FROM public.commercial_spaces space
  WHERE space.slug = p_slug AND space.status = 'published'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.search_commercial_spaces(TEXT, TEXT, TEXT, NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_commercial_space(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_commercial_spaces(TEXT, TEXT, TEXT, NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_commercial_space(TEXT) TO anon, authenticated;

COMMENT ON TABLE public.commercial_spaces IS
  'Commercial-space discovery listings. Not a booking, escrow, insurance or rent-payment ledger.';
COMMENT ON COLUMN public.commercial_spaces.address_private IS
  'Private exact address. Public RPCs return only public_location and coordinates rounded to two decimals.';
