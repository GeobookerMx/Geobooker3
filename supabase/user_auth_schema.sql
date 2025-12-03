-- Script SQL para Sistema de Autenticación de Usuarios
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- TABLA: user_profiles (Perfiles de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_permission_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Política: Los usuarios pueden insertar su propio perfil
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- FUNCIÓN: Crear perfil automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Ejecutar función al crear nuevo usuario
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER para updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE user_profiles IS 'Perfiles de usuarios con información adicional';
COMMENT ON COLUMN user_profiles.location_permission_granted IS 'Indica si el usuario dio permiso para acceder a su ubicación';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
