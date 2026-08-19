-- Ensure production has the rental-space columns used by the PWA/admin.
-- This is intentionally idempotent because some environments were created
-- before the original rental-space migration was applied.

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
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'businesses_listing_type_check'
        AND conrelid = 'public.businesses'::regclass
    ) THEN
      ALTER TABLE public.businesses
        ADD CONSTRAINT businesses_listing_type_check
        CHECK (listing_type IN ('business', 'space_rental'));
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
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
