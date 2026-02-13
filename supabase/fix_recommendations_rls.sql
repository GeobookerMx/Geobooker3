-- =====================================================
-- FIX: Políticas RLS para user_recommendations
-- + Corrección de función is_admin()
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-02-13
-- =====================================================

-- =============================================
-- PASO 1: VERIFICAR QUE LA TABLA EXISTE
-- =============================================
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_recommendations';

-- =============================================
-- PASO 2: CORREGIR FUNCIÓN is_admin()
-- La versión anterior buscaba user_profiles.is_admin
-- que NO EXISTE. La app usa tabla admin_users.
-- =============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PASO 3: AGREGAR POLÍTICA ADMIN PARA RECOMENDACIONES
-- =============================================
DROP POLICY IF EXISTS "Admins full access recommendations" ON user_recommendations;

CREATE POLICY "Admins full access recommendations"
    ON user_recommendations FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================
-- PASO 4: VERIFICAR DATOS EXISTENTES
-- =============================================
SELECT 
    id,
    name,
    category,
    rating,
    status,
    user_id,
    created_at,
    address,
    pros,
    cons
FROM user_recommendations 
ORDER BY created_at DESC 
LIMIT 20;

-- =============================================
-- PASO 5: VERIFICAR QUÉ USUARIOS SON ADMIN
-- =============================================
SELECT * FROM admin_users;

-- =============================================
-- PASO 6: VERIFICAR FUNCIONES RPC
-- =============================================
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'can_user_recommend', 
    'count_user_recommendations_this_month', 
    'get_user_recommendation_limit',
    'is_admin'
);

-- =============================================
-- PASO 7: VERIFICAR BUCKET DE STORAGE
-- =============================================
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'recommendations';

-- =============================================
-- PASO 8: VERIFICAR POLÍTICAS FINALES
-- =============================================
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'user_recommendations'
ORDER BY policyname;

-- =============================================
-- ✅ RESULTADO ESPERADO PASO 8:
-- 
-- 1. "Admins full access recommendations"  → ALL
-- 2. "Authenticated users can create..."   → INSERT  
-- 3. "Public can view approved..."         → SELECT
-- 4. "Users can delete own pending..."     → DELETE
-- 5. "Users can update own pending..."     → UPDATE
-- 6. "Users can view own recommendations"  → SELECT
-- =============================================
