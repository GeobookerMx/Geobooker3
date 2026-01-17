-- Arreglo para la tabla scraping_history
-- Supabase upsert requiere un constraint único real

-- 1. Eliminar el índice anterior si existe
DROP INDEX IF EXISTS idx_scraping_history_unique_phone;

-- 2. Añadir un constraint único real
-- Nota: Esto evitará duplicados de (teléfono, búsqueda, ubicación)
ALTER TABLE scraping_history 
ADD CONSTRAINT scraping_history_phone_search_unique 
UNIQUE (phone, search_query, search_location);

-- 3. Asegurar que los permisos estén bien
GRANT SELECT, INSERT, UPDATE ON scraping_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON scraping_history TO anon;
GRANT SELECT, INSERT, UPDATE ON scraping_history TO service_role;
