-- ============================================================================
-- GEOBOOKER SECURITY EVENTS + APPLE ROTATION REMINDER
-- Fecha sugerida: 2026-08
-- Objetivo:
-- - Registrar eventos sospechosos de Netlify/Stripe/checkout sin exponerlos al publico.
-- - Mostrar alertas en Admin Dashboard.
-- - Dejar Apple credential rotation como pendiente controlado hasta 2027-02-01.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  source text NOT NULL DEFAULT 'platform',
  route text,
  actor_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash text,
  user_agent text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'false_positive')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_detected
  ON public.security_events (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity_status
  ON public.security_events (severity, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON public.security_events (event_type, detected_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read security events" ON public.security_events;
CREATE POLICY "Admins can read security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;
CREATE POLICY "Admins can update security events"
ON public.security_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);

-- No se crea INSERT publico. Netlify Functions con SUPABASE_SERVICE_ROLE_KEY pueden insertar.

CREATE OR REPLACE FUNCTION public.touch_security_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('resolved', 'false_positive') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
    NEW.resolved_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_security_events_updated_at ON public.security_events;
CREATE TRIGGER trg_touch_security_events_updated_at
BEFORE UPDATE ON public.security_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_security_events_updated_at();

-- Recordatorio controlado: NO rotar Apple ahora; revisar al cumplir 180 dias.
INSERT INTO public.security_events (
  event_type,
  severity,
  source,
  route,
  message,
  metadata,
  detected_at
)
SELECT
  'apple_credentials_rotation_pending',
  'warning',
  'security_governance',
  '/admin/dashboard',
  'Apple credentials rotation pending by decision. Do not rotate now; review on 2027-02-01.',
  jsonb_build_object(
    'rotation_target_date', '2027-02-01',
    'decision', 'defer_rotation_until_180_day_window',
    'action_required_now', false,
    'owner_note', 'Revisar antes de nuevos builds iOS o antes del 2027-02-01, lo que ocurra primero.'
  ),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.security_events
  WHERE event_type = 'apple_credentials_rotation_pending'
    AND status IN ('open', 'reviewing')
);

COMMIT;

NOTIFY pgrst, 'reload schema';
