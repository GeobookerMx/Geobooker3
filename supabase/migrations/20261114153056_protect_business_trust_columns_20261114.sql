-- RLS restricts rows, while column grants restrict which fields owners can edit.
BEGIN;

REVOKE UPDATE ON TABLE public.businesses FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON TABLE public.businesses FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Auth users create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow bulk import and owner insert" ON public.businesses;

GRANT UPDATE (
  name, manager_name, manager_role, description, category, subcategory,
  address, city, city_name, state_code, postal_code, suburb, country_code,
  phone, whatsapp, website, website_url, email, contact_email,
  facebook, instagram, tiktok, latitude, longitude,
  offers_invoicing, invoicing_details, has_job_openings, job_openings_details,
  images, opening_hours, tags, is_mobile_business, is_visible,
  logo_url, logo_source, has_custom_logo, logo_uploaded_at, marker_style, cover_photo,
  preferred_language, employee_count, listing_type, space_type,
  monthly_rent, rent_currency, area_sqm, available_from, updated_at
) ON TABLE public.businesses TO authenticated;

-- New owner listings receive server defaults: pending, unverified, unfeatured.
-- The existing businesses_insert_safe policy still requires owner_id = auth.uid().
GRANT INSERT (
  owner_id, name, manager_name, manager_role, description, category, subcategory,
  address, city, city_name, state_code, postal_code, suburb, country_code,
  phone, whatsapp, website, website_url, email, contact_email,
  facebook, instagram, tiktok, latitude, longitude,
  offers_invoicing, invoicing_details, has_job_openings, job_openings_details,
  images, opening_hours, tags, is_mobile_business, is_visible,
  logo_url, logo_source, has_custom_logo, logo_uploaded_at, marker_style, cover_photo,
  preferred_language, employee_count, listing_type, space_type,
  monthly_rent, rent_currency, area_sqm, available_from, attribution_text
) ON TABLE public.businesses TO authenticated;

-- Admin approval is mediated by a role-checked RPC, because the status column
-- is no longer directly writable through the Data API.
CREATE OR REPLACE FUNCTION public.admin_set_business_status(p_business_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses
  SET status = p_status, updated_at = now()
  WHERE id = p_business_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_business_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_business_status(uuid, text) TO authenticated;

COMMIT;
