-- Verification gate for the bounded Overture pilot.
-- This migration is intentionally separate so Supabase Preview executes the
-- assertions even when the seed migration was already applied.

DO $$
DECLARE
  los_angeles_count INTEGER;
  toronto_count INTEGER;
  madrid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO los_angeles_count
  FROM public.international_businesses
  WHERE source_type = 'seed_overture'
    AND country_code = 'US'
    AND city = 'Los Angeles';

  SELECT COUNT(*) INTO toronto_count
  FROM public.international_businesses
  WHERE source_type = 'seed_overture'
    AND country_code = 'CA'
    AND city = 'Toronto';

  SELECT COUNT(*) INTO madrid_count
  FROM public.international_businesses
  WHERE source_type = 'seed_overture'
    AND country_code = 'ES'
    AND city = 'Madrid';

  IF los_angeles_count <> 1000 THEN
    RAISE EXCEPTION 'Los Angeles pilot count: expected 1000, got %', los_angeles_count;
  END IF;
  IF toronto_count <> 1000 THEN
    RAISE EXCEPTION 'Toronto pilot count: expected 1000, got %', toronto_count;
  END IF;
  IF madrid_count <> 1000 THEN
    RAISE EXCEPTION 'Madrid pilot count: expected 1000, got %', madrid_count;
  END IF;
END $$;
