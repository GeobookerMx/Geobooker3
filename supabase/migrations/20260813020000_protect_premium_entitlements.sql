-- Premium entitlements must only be changed by trusted server-side processes.
-- This migration preserves authenticated access to every non-entitlement profile
-- column that exists when it is applied, while Stripe/referral SECURITY DEFINER
-- functions and the service role retain their server-side capabilities.

DO $$
DECLARE
  safe_insert_columns TEXT;
  safe_update_columns TEXT;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
    INTO safe_insert_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND is_generated = 'NEVER'
    AND column_name <> ALL (ARRAY[
      'is_premium', 'is_premium_owner', 'premium_since', 'premium_until',
      'stripe_customer_id', 'stripe_subscription_id', 'last_payment_method'
    ]);

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
    INTO safe_update_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND is_generated = 'NEVER'
    AND column_name <> 'id'
    AND column_name <> ALL (ARRAY[
      'is_premium', 'is_premium_owner', 'premium_since', 'premium_until',
      'stripe_customer_id', 'stripe_subscription_id', 'last_payment_method'
    ]);

  REVOKE INSERT, UPDATE ON public.user_profiles FROM authenticated;
  REVOKE INSERT, UPDATE ON public.user_profiles FROM anon;

  IF safe_insert_columns IS NOT NULL THEN
    EXECUTE format(
      'GRANT INSERT (%s) ON public.user_profiles TO authenticated',
      safe_insert_columns
    );
  END IF;

  IF safe_update_columns IS NOT NULL THEN
    EXECUTE format(
      'GRANT UPDATE (%s) ON public.user_profiles TO authenticated',
      safe_update_columns
    );
  END IF;
END;
$$;

COMMENT ON COLUMN public.user_profiles.is_premium
  IS 'Server-managed entitlement. Clients cannot insert or update this column directly.';
COMMENT ON COLUMN public.user_profiles.is_premium_owner
  IS 'Server-managed owner entitlement. Clients cannot insert or update this column directly.';
