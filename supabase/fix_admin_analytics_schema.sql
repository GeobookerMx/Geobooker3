-- ==========================================================
-- FIX ADMIN & ANALYTICS SCHEMA (SIMPLIFIED)
-- Ejecutar en Supabase SQL Editor
-- ==========================================================

-- PASO 1: Añadir columnas faltantes a user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_premium_owner BOOLEAN DEFAULT false;

-- PASO 2: Sincronizar perfiles desde auth.users
DO $$ 
BEGIN 
    INSERT INTO public.user_profiles (id, email, full_name)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Usuario Registrado')
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name);
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- PASO 3: Crear perfiles para dueños de negocios huérfanos
INSERT INTO public.user_profiles (id, email, full_name)
SELECT b.owner_id, 'user_' || substr(b.owner_id::text, 1, 8) || '@geobooker.com', 'Usuario Migrado'
FROM public.businesses b
LEFT JOIN public.user_profiles p ON b.owner_id = p.id
WHERE p.id IS NULL AND b.owner_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- PASO 4: Añadir Foreign Key para relación businesses <-> user_profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'businesses_owner_id_user_profiles_fkey') THEN
        ALTER TABLE public.businesses ADD CONSTRAINT businesses_owner_id_user_profiles_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- PASO 5: Crear RPC get_users_for_admin (para UsersPage.jsx)
DROP FUNCTION IF EXISTS get_users_for_admin();
CREATE FUNCTION get_users_for_admin()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, is_premium BOOLEAN, is_premium_owner BOOLEAN, business_count INTEGER, created_at TIMESTAMPTZ) 
LANGUAGE SQL SECURITY DEFINER AS $$
    SELECT 
        p.id, p.full_name, p.email, p.is_premium, p.is_premium_owner,
        (SELECT COUNT(*)::INTEGER FROM businesses b WHERE b.owner_id = p.id),
        p.created_at
    FROM public.user_profiles p
    ORDER BY p.created_at DESC;
$$;

-- NOTA: La función get_ad_inventory_status() ya existe en ad_inventory_analytics.sql
-- No es necesario recrearla aquí.

-- Verificación
SELECT 'Script ejecutado correctamente' as status;
