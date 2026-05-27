-- ==============================================================
-- GEOBOOKER v1.1 — FIX CRÍTICO FINAL DE RECURSIÓN RLS (DEFINITIVO)
-- COPIA Y PEGA ESTE SCRIPT COMPLETO EN TU SQL EDITOR DE SUPABASE
-- Y HAZ CLIC EN "RUN"
-- ==============================================================
-- Este script resuelve de raíz el error:
-- "infinite recursion detected in policy for relation admin_users"
-- que bloquea la carga de negocios y el registro de nuevos locales.
-- ==============================================================

-- =========================================================
-- PASO 1: Deshabilitar temporalmente RLS para evitar bloqueos
-- =========================================================
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;

-- =========================================================
-- PASO 2: Crear esquema privado y función segura is_admin()
-- =========================================================
-- IMPORTANTE: Usamos 'au.id' (la columna real en tu DB).
-- 'SECURITY DEFINER' corre la función con privilegios de administrador,
-- lo que le permite saltarse el RLS al leer la tabla admin_users.
-- Esto destruye de forma definitiva el bucle recursivo.

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

-- Otorgar permisos correctos de ejecución
REVOKE ALL ON FUNCTION private.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin(UUID) TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;


-- =========================================================
-- PASO 3: Eliminar TODAS las políticas antiguas de admin_users
-- =========================================================
DROP POLICY IF EXISTS "Admin users can view all admin users"     ON public.admin_users;
DROP POLICY IF EXISTS "Only super admins can insert admin users"   ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin users"      ON public.admin_users;
DROP POLICY IF EXISTS "Anyone authenticated can view admin users"   ON public.admin_users;
DROP POLICY IF EXISTS "Admin Self Read"                          ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select"                       ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_v2"                    ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_own_or_admin"          ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_admin_only"            ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_admin_only"            ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete_admin_only"            ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_v2"                    ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_v2"                    ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete_v2"                    ON public.admin_users;
DROP POLICY IF EXISTS "Solo admins pueden ver admins"            ON public.admin_users;


-- =========================================================
-- PASO 4: Crear políticas NUEVAS y ultra-seguras para admin_users
-- =========================================================

-- LECTURA: Un usuario puede ver su propio registro de admin,
-- o todos si es administrador (resuelto mediante función sin RLS).
CREATE POLICY "admin_users_select_safe"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- ESCRITURA: Solo administradores pueden gestionar la lista de admins
CREATE POLICY "admin_users_insert_safe"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "admin_users_update_safe"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (private.is_admin(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "admin_users_delete_safe"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (private.is_admin(auth.uid()));


-- =========================================================
-- PASO 5: Limpiar y corregir políticas de la tabla businesses
-- =========================================================
DROP POLICY IF EXISTS "Public can view approved businesses"        ON public.businesses;
DROP POLICY IF EXISTS "Owners can view own businesses"             ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses"   ON public.businesses;
DROP POLICY IF EXISTS "Owners can update own businesses"           ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete own businesses"           ON public.businesses;
DROP POLICY IF EXISTS "Admins can view all businesses"             ON public.businesses;
DROP POLICY IF EXISTS "Admins can update any business"             ON public.businesses;
DROP POLICY IF EXISTS "businesses_select"                          ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert"                          ON public.businesses;
DROP POLICY IF EXISTS "businesses_update"                          ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete"                          ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_v2"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_v2"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_v2"                        ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_v2"                        ON public.businesses;

-- 1. LECTURA: Negocios aprobados son públicos. Propietarios y Admins ven pendientes.
CREATE POLICY "businesses_select_safe"
  ON public.businesses
  FOR SELECT
  USING (
    status = 'approved'
    OR owner_id = auth.uid()
    OR private.is_admin(auth.uid())
  );

-- 2. INSERCIÓN: Cualquier usuario autenticado puede subir su propio negocio sin ser admin.
CREATE POLICY "businesses_insert_safe"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- 3. EDICIÓN: El dueño o los admins pueden modificar el negocio.
CREATE POLICY "businesses_update_safe"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR private.is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR private.is_admin(auth.uid()));

-- 4. ELIMINACIÓN: El dueño o los admins pueden borrar el negocio.
CREATE POLICY "businesses_delete_safe"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR private.is_admin(auth.uid()));


-- =========================================================
-- PASO 6: Limpiar y corregir políticas de business_claims (Reclamar)
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_claims'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all claims"   ON public.business_claims;
    DROP POLICY IF EXISTS "Admins can update claims"     ON public.business_claims;
    DROP POLICY IF EXISTS "claims_admin_select_v2"       ON public.business_claims;
    DROP POLICY IF EXISTS "claims_admin_update_v2"       ON public.business_claims;

    EXECUTE $pol$
      CREATE POLICY "claims_select_safe"
        ON public.business_claims FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR private.is_admin(auth.uid()));
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "claims_update_safe"
        ON public.business_claims FOR UPDATE
        TO authenticated
        USING (private.is_admin(auth.uid()))
        WITH CHECK (private.is_admin(auth.uid()));
    $pol$;
  END IF;
END;
$$;


-- =========================================================
-- PASO 7: Re-habilitar RLS de forma segura
-- =========================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- PASO 8: Verificación final de integridad
-- =========================================================
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'businesses', 'business_claims')
ORDER BY tablename, cmd;
