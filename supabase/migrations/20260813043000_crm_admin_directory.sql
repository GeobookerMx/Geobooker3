-- CRM 2.0 admin directory: read-only, paginated and PII-minimized list RPCs.

CREATE OR REPLACE FUNCTION public.crm_account_directory(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  industry TEXT,
  country_code TEXT,
  city TEXT,
  account_status TEXT,
  contact_count BIGINT,
  open_opportunity_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  search_text TEXT := lower(trim(COALESCE(p_search, '')));
BEGIN
  IF NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 100 OR p_offset < 0 OR length(search_text) > 100 THEN
    RAISE EXCEPTION 'invalid_query_bounds';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'inactive', 'needs_review', 'merged', 'archived') THEN
    RAISE EXCEPTION 'invalid_status_filter';
  END IF;

  RETURN QUERY
  SELECT account.id, account.display_name, account.industry, account.country_code,
    account.city, account.account_status,
    (SELECT count(*) FROM crm.account_contacts relation WHERE relation.account_id = account.id),
    (SELECT count(*) FROM crm.opportunities opportunity
      WHERE opportunity.account_id = account.id AND opportunity.status = 'open'),
    count(*) OVER ()
  FROM crm.accounts AS account
  WHERE (p_status IS NULL OR account.account_status = p_status)
    AND (search_text = ''
      OR strpos(account.normalized_name, search_text) > 0
      OR strpos(lower(COALESCE(account.normalized_domain, '')), search_text) > 0
      OR strpos(lower(COALESCE(account.city, '')), search_text) > 0)
  ORDER BY account.display_name, account.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_contact_directory(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  job_title TEXT,
  country_code TEXT,
  contact_status TEXT,
  account_id UUID,
  account_display_name TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  search_text TEXT := lower(trim(COALESCE(p_search, '')));
BEGIN
  IF NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 100 OR p_offset < 0 OR length(search_text) > 100 THEN
    RAISE EXCEPTION 'invalid_query_bounds';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'inactive', 'needs_review', 'merged', 'archived') THEN
    RAISE EXCEPTION 'invalid_status_filter';
  END IF;

  RETURN QUERY
  SELECT contact.id, contact.full_name, contact.job_title, contact.country_code,
    contact.contact_status, account.id, account.display_name, count(*) OVER ()
  FROM crm.contacts AS contact
  LEFT JOIN LATERAL (
    SELECT linked_account.id, linked_account.display_name
    FROM crm.account_contacts relation
    JOIN crm.accounts linked_account ON linked_account.id = relation.account_id
    WHERE relation.contact_id = contact.id
    ORDER BY relation.is_primary DESC, relation.created_at
    LIMIT 1
  ) AS account ON TRUE
  WHERE (p_status IS NULL OR contact.contact_status = p_status)
    AND (p_account_id IS NULL OR account.id = p_account_id)
    AND (search_text = ''
      OR strpos(COALESCE(contact.normalized_name, ''), search_text) > 0
      OR strpos(lower(COALESCE(contact.job_title, '')), search_text) > 0
      OR strpos(lower(COALESCE(account.display_name, '')), search_text) > 0)
  ORDER BY contact.full_name NULLS LAST, contact.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_account_directory(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.crm_contact_directory(TEXT, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_account_directory(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_contact_directory(TEXT, TEXT, UUID, INTEGER, INTEGER) TO authenticated, service_role;

