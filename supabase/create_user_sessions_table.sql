-- ============================================
-- TABLA: user_sessions
-- Propósito: Trackear signups y logins para analytics
-- Fecha: 26 Enero 2026
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, 
  -- Valores: 'signup_email', 'signup_google', 'signup_apple', 'login_email', 'login_google', 'login_apple'
  
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  referral_source TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
  ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at 
  ON user_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_type 
  ON user_sessions(session_type);

-- Nota: No creamos índice en DATE(created_at) porque DATE() no es IMMUTABLE
-- El índice en created_at ya es suficiente para queries por fecha

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver solo sus propias sesiones
CREATE POLICY "Users can view own sessions" 
  ON user_sessions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Permitir inserts desde el frontend (anon key)
CREATE POLICY "Anon can insert sessions" 
  ON user_sessions
  FOR INSERT 
  WITH CHECK (true);

-- Nota: Los admins pueden ver todo mediante el service_role key de Supabase
-- No creamos política especial porque no hay columna is_admin en user_profiles

-- ============================================
-- COMENTARIOS de documentación
-- ============================================
COMMENT ON TABLE user_sessions IS 
  'Tracking de signups y logins para analytics. Se usa en GA4 y dashboard admin.';

COMMENT ON COLUMN user_sessions.session_type IS 
  'Tipo de sesión: signup_email, signup_google, signup_apple, login_email, login_google, login_apple';

COMMENT ON COLUMN user_sessions.referral_source IS 
  'Código de referido si el signup fue por referral';

-- ============================================
-- FUNCIÓN HELPER para obtener stats
-- ============================================
CREATE OR REPLACE FUNCTION get_signup_stats(days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_signups BIGINT,
  signups_email BIGINT,
  signups_google BIGINT,
  signups_apple BIGINT,
  signups_today BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE session_type LIKE 'signup_%') as total_signups,
    COUNT(*) FILTER (WHERE session_type = 'signup_email') as signups_email,
    COUNT(*) FILTER (WHERE session_type = 'signup_google') as signups_google,
    COUNT(*) FILTER (WHERE session_type = 'signup_apple') as signups_apple,
    COUNT(*) FILTER (WHERE session_type LIKE 'signup_%' AND DATE(created_at) = CURRENT_DATE) as signups_today
  FROM user_sessions
  WHERE created_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto para verificar que se creó correctamente:
-- SELECT * FROM user_sessions LIMIT 1;
-- SELECT * FROM get_signup_stats(7);
