-- Only the two verified owner accounts may hold administrator access.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.admin_users a
    LEFT JOIN auth.users u ON u.id = a.id
    WHERE lower(coalesce(a.email, '')) NOT IN (
      'juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com'
    )
       OR lower(coalesce(u.email, '')) <> lower(coalesce(a.email, ''))
       OR u.email_confirmed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Review admin_users before applying owner allowlist';
  END IF;
END;
$$;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_owner_emails_only_20261114
  CHECK (email IS NOT NULL AND lower(email) IN (
    'juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com'
  ));

CREATE OR REPLACE FUNCTION private.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT check_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_users a
    JOIN auth.users u ON u.id = a.id
    WHERE a.id = check_user_id
      AND lower(a.email) = lower(u.email)
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) IN ('juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION crm.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT private.is_admin(check_user_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_admin_account_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = NEW.id
      AND lower(u.email) = lower(NEW.email)
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) IN ('juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Only verified owner accounts may be administrators' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_admin_account_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER admin_users_owner_identity_20261114
BEFORE INSERT OR UPDATE OF id, email ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_account_identity();

CREATE OR REPLACE FUNCTION public.prevent_admin_email_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = NEW.id)
     AND lower(coalesce(NEW.email, '')) <> lower(coalesce(OLD.email, '')) THEN
    RAISE EXCEPTION 'Review admin access before changing this email' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_admin_email_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER auth_users_admin_email_guard_20261114
BEFORE UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_email_change();

-- The dashboard reads the directory, but browser clients cannot add or edit
-- administrators. Service-side maintenance remains available.
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;
DROP POLICY IF EXISTS admin_users_select_safe ON public.admin_users;
CREATE POLICY admin_users_select_safe ON public.admin_users
FOR SELECT TO authenticated
USING (id = auth.uid() OR private.is_admin(auth.uid()));

COMMIT;
