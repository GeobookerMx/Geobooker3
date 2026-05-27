-- ==============================================================
-- GEOBOOKER v1.1 — FIX CRÍTICO DE RECURSIÓN RLS
-- Ejecutar COMPLETO en Supabase SQL Editor (Ctrl+A, luego Run)
-- ==============================================================
-- Este script soluciona el error:
-- "infinite recursion detected in policy for relation admin_users"
-- que bloquea el registro y carga de negocios.
-- ==============================================================


-- =========================================================
-- PASO 1: Crear esquema privado y función segura is_admin()
-- =========================================================
-- Esta función usa SECURITY DEFINER para correr con permisos
-- elevados (postgres), sin disparar RLS sobre admin_users.
-- Así se rompe el ciclo de recursión infinita.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin(
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = check_user_id
  );
$$;

-- Seguridad: solo usuarios autenticados pueden llamar esta función
REVOKE ALL ON FUNCTION private.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(UUID) TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;


-- =========================================================
-- PASO 2: Limpiar TODAS las políticas antiguas de admin_users
-- (Son las que causan la recursión)
-- =========================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view all admin users"   ON public.admin_users;
DROP POLICY IF EXISTS "Only super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users"    ON public.admin_users;
DROP POLICY IF EXISTS "Anyone authenticated can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin Self Read"                        ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select"                     ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_own_or_admin"        ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_admin_only"          ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_admin_only"          ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete_admin_only"          ON public.admin_users;


-- =========================================================
-- PASO 3: Crear políticas NUEVAS sin recursión en admin_users
-- =========================================================

-- Cualquier usuario autenticado puede saber si él mismo es admin
-- (comparación directa sin subquery a la misma tabla)
CREATE POLICY "admin_users_select_v2"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR private.is_admin(auth.uid())
  );

-- Solo admins pueden agregar otros admins
CREATE POLICY "admin_users_insert_v2"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin(auth.uid()));

-- Solo admins pueden actualizar admin records
CREATE POLICY "admin_users_update_v2"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (private.is_admin(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()));

-- Solo admins pueden eliminar admin records
CREATE POLICY "admin_users_delete_v2"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (private.is_admin(auth.uid()));


-- =========================================================
-- PASO 4: Limpiar y corregir políticas de la tabla businesses
-- (También afectadas por la recursión de admin_users)
-- =========================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved businesses"      ON public.businesses;
DROP POLICY IF EXISTS "Owners can view own businesses"           ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update own businesses"         ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete own businesses"         ON public.businesses;
DROP POLICY IF EXISTS "Admins can view all businesses"           ON public.businesses;
DROP POLICY IF EXISTS "Admins can update any business"           ON public.businesses;
DROP POLICY IF EXISTS "businesses_select"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_update"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete"                        ON public.businesses;


-- Usuarios pueden ver: negocios aprobados (público), o sus propios negocios (aunque estén pending)
CREATE POLICY "businesses_select_v2"
  ON public.businesses
  FOR SELECT
  USING (
    status = 'approved'
    OR owner_id = auth.uid()
    OR private.is_admin(auth.uid())
  );

-- Cualquier usuario autenticado puede registrar SU PROPIO negocio
CREATE POLICY "businesses_insert_v2"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Dueños pueden editar sus negocios. Admins pueden editar cualquiera.
CREATE POLICY "businesses_update_v2"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR private.is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR private.is_admin(auth.uid()));

-- Dueños pueden eliminar sus negocios. Admins también.
CREATE POLICY "businesses_delete_v2"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR private.is_admin(auth.uid()));


-- =========================================================
-- PASO 5: Corregir políticas de business_claims si existen
-- (También consultan admin_users directamente)
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_claims'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all claims"   ON public.business_claims;
    DROP POLICY IF EXISTS "Admins can update claims"     ON public.business_claims;

    EXECUTE $pol$
      CREATE POLICY "claims_admin_select_v2"
        ON public.business_claims FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR private.is_admin(auth.uid()));
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "claims_admin_update_v2"
        ON public.business_claims FOR UPDATE
        TO authenticated
        USING (private.is_admin(auth.uid()))
        WITH CHECK (private.is_admin(auth.uid()));
    $pol$;
  END IF;
END;
$$;


-- =========================================================
-- PASO 6: Verificación final
-- =========================================================

-- Ver que la función existe
SELECT
  routine_schema,
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'private' AND routine_name = 'is_admin';

-- Ver policies activas en admin_users y businesses
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'businesses', 'business_claims')
ORDER BY tablename, cmd;
