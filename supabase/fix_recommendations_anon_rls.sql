-- =====================================================
-- FIX: Permitir lectura de recomendaciones aprobadas para usuarios anónimos
-- El problema: la política original no especificaba TO anon,
-- por lo que usuarios no logueados no podían ver recomendaciones en el mapa
-- Fecha: 2026-02-15
-- =====================================================

-- PASO 1: Eliminar la política actual
DROP POLICY IF EXISTS "Public can view approved recommendations" ON user_recommendations;

-- PASO 2: Recrear con acceso explícito para anon Y authenticated
CREATE POLICY "Public can view approved recommendations"
    ON user_recommendations FOR SELECT
    TO anon, authenticated
    USING (status = 'approved');

-- PASO 3: Verificar
SELECT policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'user_recommendations'
ORDER BY policyname;

-- PASO 4: Test - esto debería devolver las recomendaciones aprobadas
SELECT id, name, status, latitude, longitude 
FROM user_recommendations 
WHERE status = 'approved';
