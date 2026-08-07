-- Independent claim workflow for imported international businesses.

BEGIN;

ALTER TABLE public.international_businesses
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.international_business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.international_businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimer_name TEXT NOT NULL,
  claimer_role TEXT NOT NULL DEFAULT 'owner'
    CHECK (claimer_role IN ('owner', 'manager', 'representative')),
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  social_media TEXT,
  evidence_description TEXT,
  evidence_photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_international_claims_business
  ON public.international_business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_international_claims_user
  ON public.international_business_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_international_claims_status
  ON public.international_business_claims(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_international_claim_per_user
  ON public.international_business_claims(business_id, user_id)
  WHERE status IN ('submitted', 'under_review');

ALTER TABLE public.international_business_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS international_claims_insert_own_v1
  ON public.international_business_claims;
CREATE POLICY international_claims_insert_own_v1
  ON public.international_business_claims
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS international_claims_select_own_v1
  ON public.international_business_claims;
CREATE POLICY international_claims_select_own_v1
  ON public.international_business_claims
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS international_claims_admin_select_v1 ON public.international_business_claims';
    EXECUTE $policy$
      CREATE POLICY international_claims_admin_select_v1
      ON public.international_business_claims
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
      ))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS international_claims_admin_update_v1 ON public.international_business_claims';
    EXECUTE $policy$
      CREATE POLICY international_claims_admin_update_v1
      ON public.international_business_claims
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
      ))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS international_businesses_admin_update_v1 ON public.international_businesses';
    EXECUTE $policy$
      CREATE POLICY international_businesses_admin_update_v1
      ON public.international_businesses
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
      ))
    $policy$;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.international_business_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_business_claims TO service_role;
GRANT UPDATE ON public.international_businesses TO authenticated;

COMMIT;
