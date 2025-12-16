-- ==========================================================
-- SCRIPT DE LIMPIEZA DE ADMINISTRADORES
-- ==========================================================

-- 1. Eliminar todos los usuarios de la tabla admin_users
--    EXCEPTO los dos administradores legítimos.
DELETE FROM admin_users 
WHERE email NOT IN ('juan.pablo.pg@hotmail.com', 'jpvaness85@gmail.com');

-- 2. Verificar el resultado (deberían quedar solo 2)
SELECT * FROM admin_users;
