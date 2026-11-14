-- Corregir verificación de rol service_role en generate_daily_whatsapp_queue
-- Migración: 20261114171500_fix_whatsapp_queue_auth_check.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_whatsapp_queue(p_limit integer DEFAULT 20, p_tier_filter text DEFAULT NULL)
RETURNS TABLE(contacts_added integer, tier_distribution jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT crm.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.generate_daily_whatsapp_queue_internal_20261114(p_limit, p_tier_filter);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_daily_whatsapp_queue(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_daily_whatsapp_queue_internal_20261114(integer, text) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.mark_whatsapp_sent(p_contact_id uuid, p_queue_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT crm.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.mark_whatsapp_sent_internal_20261114(p_contact_id, p_queue_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_whatsapp_sent(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_whatsapp_sent_internal_20261114(uuid, uuid) TO postgres, service_role;

COMMIT;
