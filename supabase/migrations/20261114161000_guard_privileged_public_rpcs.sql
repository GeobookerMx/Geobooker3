-- Keep existing RPC signatures while moving the old implementations behind
-- authorization checks. The old functions are no longer executable by API roles.
BEGIN;

ALTER FUNCTION public.add_blocked_word(text, text, integer) RENAME TO add_blocked_word_internal_20261114;
ALTER FUNCTION public.create_makegood(uuid, text, text) RENAME TO create_makegood_internal_20261114;
ALTER FUNCTION public.generate_daily_whatsapp_queue(integer, text) RENAME TO generate_daily_whatsapp_queue_internal_20261114;
ALTER FUNCTION public.mark_whatsapp_sent(uuid, uuid) RENAME TO mark_whatsapp_sent_internal_20261114;
ALTER FUNCTION public.mark_whatsapp_sent(uuid[], text) RENAME TO mark_whatsapp_sent_bulk_internal_20261114;
ALTER FUNCTION public.redeem_points_for_ad(uuid, text, integer, uuid, text, text) RENAME TO redeem_points_for_ad_internal_20261114;

ALTER FUNCTION public.add_blocked_word_internal_20261114(text, text, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_makegood_internal_20261114(uuid, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_daily_whatsapp_queue_internal_20261114(integer, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.mark_whatsapp_sent_internal_20261114(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.mark_whatsapp_sent_bulk_internal_20261114(uuid[], text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.redeem_points_for_ad_internal_20261114(uuid, text, integer, uuid, text, text) SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.add_blocked_word_internal_20261114(text, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_makegood_internal_20261114(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_daily_whatsapp_queue_internal_20261114(integer, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_whatsapp_sent_internal_20261114(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_whatsapp_sent_bulk_internal_20261114(uuid[], text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redeem_points_for_ad_internal_20261114(uuid, text, integer, uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.add_blocked_word(p_word text, p_category text DEFAULT 'profanity', p_severity integer DEFAULT 1)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.add_blocked_word_internal_20261114(p_word, p_category, p_severity);
END;
$$;

CREATE FUNCTION public.create_makegood(p_campaign_id uuid, p_compensation_type text DEFAULT 'impressions', p_compensation_value text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT crm.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.create_makegood_internal_20261114(p_campaign_id, p_compensation_type, p_compensation_value);
END;
$$;

CREATE FUNCTION public.generate_daily_whatsapp_queue(p_limit integer DEFAULT 20, p_tier_filter text DEFAULT NULL)
RETURNS TABLE(contacts_added integer, tier_distribution jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR NOT crm.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.generate_daily_whatsapp_queue_internal_20261114(p_limit, p_tier_filter);
END;
$$;

CREATE FUNCTION public.mark_whatsapp_sent(p_contact_id uuid, p_queue_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR NOT crm.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.mark_whatsapp_sent_internal_20261114(p_contact_id, p_queue_id);
END;
$$;

CREATE FUNCTION public.mark_whatsapp_sent(contact_ids uuid[], template_name text DEFAULT 'default')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR NOT crm.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.mark_whatsapp_sent_bulk_internal_20261114(contact_ids, template_name);
END;
$$;

CREATE FUNCTION public.redeem_points_for_ad(
  p_user_id uuid, p_reward_type text, p_duration_days integer, p_business_id uuid,
  p_target_city text DEFAULT NULL, p_target_category text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.redeem_points_for_ad_internal_20261114(
    p_user_id, p_reward_type, p_duration_days, p_business_id, p_target_city, p_target_category
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_business(p_business_id uuid, p_user_id uuid, p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.businesses
  SET owner_id = auth.uid(), is_claimed = true,
      verification_token = NULL, status = 'approved'
  WHERE id = p_business_id
    AND is_claimed = false
    AND verification_token = p_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.add_blocked_word(text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_makegood(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_daily_whatsapp_queue(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_whatsapp_sent(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_whatsapp_sent(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_points_for_ad(uuid, text, integer, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_business(uuid, uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.add_blocked_word(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_makegood(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_whatsapp_queue(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_whatsapp_sent(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_whatsapp_sent(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_points_for_ad(uuid, text, integer, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_business(uuid, uuid, text) TO authenticated;

COMMIT;
