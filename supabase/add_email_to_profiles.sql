-- =====================================================
-- ACTUALIZACIÓN: Agregar email a user_profiles y sincronizar
-- =====================================================

-- 1. Agregar columna email si no existe
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Actualizar función handle_new_user para incluir email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Sincronizar emails existentes desde auth.users a user_profiles
-- Esto solo funciona si se ejecuta como superusuario/admin en el editor de Supabase
UPDATE public.user_profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Comentario
COMMENT ON COLUMN user_profiles.email IS 'Copia del email de auth.users para facilitar consultas y notificaciones';
