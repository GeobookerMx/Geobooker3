-- ================================================================
-- SISTEMA DE SINÓNIMOS REGIONALES PARA BÚSQUEDA
-- Mejora SEO y búsquedas "humanas" por país/región
-- ================================================================

-- 1. Crear tabla de sinónimos
CREATE TABLE IF NOT EXISTS category_synonyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id TEXT NOT NULL,           -- ID canónico (tire_service, grocery_store_small, etc.)
    term TEXT NOT NULL,                  -- Sinónimo tal cual (talachas, vulcanizadora, etc.)
    term_normalized TEXT NOT NULL,       -- Normalizado: lowercase, sin acentos
    locale TEXT DEFAULT 'es-MX',         -- es-MX, es-AR, pt-BR, en-US
    country TEXT,                        -- MX, AR, BR, etc.
    region TEXT,                         -- MX-CDMX, MX-JAL, AR-CABA (opcional)
    weight INTEGER DEFAULT 50,           -- 0-100 prioridad (100 = más relevante)
    notes TEXT,                          -- Ambigüedades o contexto
    source TEXT,                         -- Link/fuente de referencia
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Índices para búsqueda rápida (drop first if exist)
DROP INDEX IF EXISTS idx_category_synonyms_term_norm;
DROP INDEX IF EXISTS idx_category_synonyms_category;
DROP INDEX IF EXISTS idx_category_synonyms_locale;
DROP INDEX IF EXISTS idx_category_synonyms_country;
DROP INDEX IF EXISTS idx_category_synonyms_weight;

CREATE INDEX idx_category_synonyms_term_norm ON category_synonyms(term_normalized);
CREATE INDEX idx_category_synonyms_category ON category_synonyms(category_id);
CREATE INDEX idx_category_synonyms_locale ON category_synonyms(locale);
CREATE INDEX idx_category_synonyms_country ON category_synonyms(country);
CREATE INDEX idx_category_synonyms_weight ON category_synonyms(weight DESC);

-- 3. Función para normalizar texto (quitar acentos, lowercase)
CREATE OR REPLACE FUNCTION normalize_search_term(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        TRANSLATE(
            input_text,
            'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
            'aaaaeeeeiiiiooooouuuunaaaaeeeeiiiioooouuuun'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Limpiar datos previos y cargar sinónimos iniciales
TRUNCATE TABLE category_synonyms;

INSERT INTO category_synonyms (category_id, term, term_normalized, locale, country, weight, notes) VALUES

-- A) LLANTAS / NEUMÁTICOS
('tire_service', 'vulcanizadora', 'vulcanizadora', 'es-MX', 'MX', 95, 'Término común en México para reparación de llantas'),
('tire_service', 'talachas', 'talachas', 'es-MX', 'MX', 90, 'Jerga mexicana muy usada'),
('tire_service', 'talachería', 'talacheria', 'es-MX', 'MX', 90, 'Variante de talachas'),
('tire_service', 'llantera', 'llantera', 'es-MX', 'MX', 85, 'Venta y reparación de llantas'),
('tire_service', 'gomería', 'gomeria', 'es-AR', 'AR', 95, 'Argentina/Uruguay/Paraguay'),
('tire_service', 'gomería', 'gomeria', 'es-UY', 'UY', 95, NULL),
('tire_service', 'borracharia', 'borracharia', 'pt-BR', 'BR', 95, 'Brasil - oficina de pneus'),
('tire_service', 'tire shop', 'tire shop', 'en-US', 'US', 90, NULL),
('tire_service', 'tire repair', 'tire repair', 'en-US', 'US', 90, NULL),

-- B) TIENDA DE BARRIO / ABARROTES
('grocery_store_small', 'tienda de abarrotes', 'tienda de abarrotes', 'es-MX', 'MX', 95, NULL),
('grocery_store_small', 'abarrotes', 'abarrotes', 'es-MX', 'MX', 90, NULL),
('grocery_store_small', 'ultramarinos', 'ultramarinos', 'es-ES', 'ES', 90, 'España - tienda de comestibles'),
('grocery_store_small', 'colmado', 'colmado', 'es-DO', 'DO', 95, 'República Dominicana'),
('grocery_store_small', 'pulpería', 'pulperia', 'es-CR', 'CR', 85, 'Costa Rica, Nicaragua - tienda de barrio'),
('grocery_store_small', 'almacén', 'almacen', 'es-AR', 'AR', 80, 'Argentina - tienda pequeña'),
('grocery_store_small', 'bodega', 'bodega', 'es-US', 'US', 75, 'EE.UU. latinos - tienda de barrio'),

-- C) FERRETERÍA
('hardware_store', 'tlapalería', 'tlapaleria', 'es-MX', 'MX', 95, 'Mexicanismo clásico'),
('hardware_store', 'ferretería', 'ferreteria', 'es-MX', 'MX', 90, 'Término general'),
('hardware_store', 'casa de materiales', 'casa de materiales', 'es-MX', 'MX', 80, NULL),

-- D) FARMACIA
('pharmacy', 'farmacia', 'farmacia', 'es-MX', 'MX', 95, NULL),
('pharmacy', 'botica', 'botica', 'es-ES', 'ES', 70, 'Sinónimo clásico RAE'),
('pharmacy', 'droguería', 'drogueria', 'es-CO', 'CO', 75, 'Colombia - farmacia'),

-- E) REFACCIONES / AUTOPARTES
('auto_parts', 'refaccionaria', 'refaccionaria', 'es-MX', 'MX', 95, 'México'),
('auto_parts', 'refaccionario', 'refaccionario', 'es-MX', 'MX', 90, 'Variante'),
('auto_parts', 'repuestos', 'repuestos', 'es-AR', 'AR', 90, 'LATAM general'),
('auto_parts', 'autopartes', 'autopartes', 'es-MX', 'MX', 85, NULL),
('auto_parts', 'auto parts', 'auto parts', 'en-US', 'US', 90, NULL),

-- F) COMIDA ECONÓMICA
('budget_lunch', 'comida corrida', 'comida corrida', 'es-MX', 'MX', 95, 'Menú del día en fondas mexicanas'),
('budget_lunch', 'fonda', 'fonda', 'es-MX', 'MX', 90, 'Lugar de comida casera'),
('budget_lunch', 'cocina económica', 'cocina economica', 'es-MX', 'MX', 85, NULL),
('budget_lunch', 'menú del día', 'menu del dia', 'es-ES', 'ES', 90, 'España y LATAM'),
('budget_lunch', 'menú ejecutivo', 'menu ejecutivo', 'es-MX', 'MX', 80, NULL),

-- G) MARISCOS
('seafood_restaurant', 'marisquería', 'marisqueria', 'es-MX', 'MX', 95, NULL),
('seafood_restaurant', 'cevichería', 'cevicheria', 'es-MX', 'MX', 90, 'México, Ecuador'),
('seafood_restaurant', 'cebichería', 'cebicheria', 'es-PE', 'PE', 90, 'Perú - RAE registra ambas'),

-- H) TACOS
('taco_shop', 'taquería', 'taqueria', 'es-MX', 'MX', 95, NULL),
('taco_shop', 'tacos', 'tacos', 'es-MX', 'MX', 85, 'Búsqueda genérica'),
('taco_shop', 'tacos al pastor', 'tacos al pastor', 'es-MX', 'MX', 75, 'Especialidad'),
('taco_shop', 'trompo', 'trompo', 'es-MX', 'MX', 70, 'Tacos de trompo'),

-- I) TORTILLAS
('tortilla_shop', 'tortillería', 'tortilleria', 'es-MX', 'MX', 95, 'México, Guatemala, Honduras'),
('tortilla_shop', 'tortillas', 'tortillas', 'es-MX', 'MX', 85, NULL),

-- J) HELADOS
('ice_cream_shop', 'heladería', 'heladeria', 'es-MX', 'MX', 90, NULL),
('ice_cream_shop', 'nevería', 'neveria', 'es-MX', 'MX', 95, 'Mexicanismo muy común'),
('ice_cream_shop', 'nieves', 'nieves', 'es-MX', 'MX', 80, 'México - helados artesanales'),

-- K) TORTERÍA (extra para México)
('sandwich_shop', 'tortería', 'torteria', 'es-MX', 'MX', 95, 'Tortas mexicanas'),
('sandwich_shop', 'tortas', 'tortas', 'es-MX', 'MX', 85, NULL),

-- L) PANADERÍA
('bakery', 'panadería', 'panaderia', 'es-MX', 'MX', 95, NULL),
('bakery', 'pan', 'pan', 'es-MX', 'MX', 70, 'Búsqueda genérica'),

-- M) CARNICERÍA
('butcher_shop', 'carnicería', 'carniceria', 'es-MX', 'MX', 95, NULL),
('butcher_shop', 'carne', 'carne', 'es-MX', 'MX', 70, NULL),

-- N) ESTÉTICA / SALÓN
('beauty_salon', 'estética', 'estetica', 'es-MX', 'MX', 95, 'México'),
('beauty_salon', 'salón de belleza', 'salon de belleza', 'es-MX', 'MX', 90, NULL),
('beauty_salon', 'peluquería', 'peluqueria', 'es-ES', 'ES', 90, 'España y LATAM'),

-- O) TINTORERÍA
('dry_cleaning', 'tintorería', 'tintoreria', 'es-MX', 'MX', 95, NULL),
('dry_cleaning', 'lavandería', 'lavanderia', 'es-MX', 'MX', 85, 'Lavado en general');

-- 5. Función de búsqueda que expande sinónimos
CREATE OR REPLACE FUNCTION search_businesses_with_synonyms(
    search_query TEXT,
    user_country TEXT DEFAULT 'MX'
)
RETURNS TABLE (
    business_id UUID,
    name TEXT,
    category TEXT,
    match_score INTEGER
) AS $$
DECLARE
    normalized_query TEXT;
BEGIN
    -- Normalizar búsqueda
    normalized_query := normalize_search_term(search_query);
    
    -- Buscar negocios expandiendo sinónimos
    RETURN QUERY
    SELECT DISTINCT
        b.id as business_id,
        b.name,
        b.category,
        CASE 
            WHEN b.name ILIKE '%' || search_query || '%' THEN 100  -- Match exacto en nombre
            WHEN cs.weight IS NOT NULL THEN cs.weight               -- Match por sinónimo
            ELSE 50                                                  -- Match genérico
        END as match_score
    FROM businesses b
    LEFT JOIN category_synonyms cs ON (
        b.category = cs.category_id 
        OR b.category ILIKE '%' || cs.category_id || '%'
    )
    WHERE (
        -- Búsqueda en nombre del negocio
        normalize_search_term(b.name) ILIKE '%' || normalized_query || '%'
        OR
        -- Búsqueda por sinónimo
        cs.term_normalized = normalized_query
        OR
        cs.term_normalized ILIKE '%' || normalized_query || '%'
    )
    -- Priorizar país del usuario
    AND (cs.country = user_country OR cs.country IS NULL OR b.name ILIKE '%' || search_query || '%')
    ORDER BY match_score DESC, b.name
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- 6. Verificación de datos cargados
SELECT 
    category_id,
    COUNT(*) as total_sinonimos,
    STRING_AGG(DISTINCT country, ', ') as paises
FROM category_synonyms
GROUP BY category_id
ORDER BY total_sinonimos DESC;

-- ✅ Sistema de sinónimos regionales listo para búsquedas SEO-friendly
