-- ================================================================
-- EXPANSION GLOBAL DEL DICCIONARIO SEMANTICO GASTRONOMICO
-- Ejecutar despues de create_category_synonyms_system.sql
-- ================================================================

INSERT INTO category_synonyms (category_id, term, term_normalized, locale, country, weight, notes)
VALUES

-- HOT DOG GLOBAL
('hot_dog_shop', 'jocho', 'jocho', 'es-MX', 'MX', 95, 'Modismo CDMX y centro de Mexico'),
('hot_dog_shop', 'dogo', 'dogo', 'es-MX', 'MX', 92, 'Norte de Mexico'),
('hot_dog_shop', 'pancho', 'pancho', 'es-UY', 'UY', 96, 'Uruguay'),
('hot_dog_shop', 'completo', 'completo', 'es-CL', 'CL', 93, 'Chile'),
('hot_dog_shop', 'perro caliente', 'perro caliente', 'es-CO', 'CO', 90, 'LatAm general'),
('hot_dog_shop', 'hot dog', 'hot dog', 'en-US', 'US', 88, 'Forma en ingles'),

-- AREPAS
('arepa_shop', 'arepas', 'arepas', 'es-VE', 'VE', 96, 'Busqueda principal'),
('arepa_shop', 'areperia', 'areperia', 'es-VE', 'VE', 95, 'Giro venezolano'),
('arepa_shop', 'areperia', 'areperia', 'es-CO', 'CO', 92, 'Uso colombiano'),
('arepa_shop', 'comida venezolana', 'comida venezolana', 'es-ES', 'ES', 88, 'Migracion gastronomica'),
('arepa_shop', 'comida colombiana', 'comida colombiana', 'es-ES', 'ES', 82, 'Contexto alterno'),

-- PUPUSAS
('pupusa_shop', 'pupusas', 'pupusas', 'es-SV', 'SV', 96, 'Busqueda principal'),
('pupusa_shop', 'pupuseria', 'pupuseria', 'es-SV', 'SV', 95, 'Giro tipico'),
('pupusa_shop', 'comida salvadorena', 'comida salvadorena', 'es-US', 'US', 90, 'Busqueda diaspora USA'),

-- TAPAS / ESPANA
('tapas_bar', 'tapas', 'tapas', 'es-ES', 'ES', 96, 'Busqueda principal'),
('tapas_bar', 'bar de tapas', 'bar de tapas', 'es-ES', 'ES', 95, 'Forma completa'),
('tapas_bar', 'tapas bar', 'tapas bar', 'en-GB', 'GB', 85, 'Busqueda turismo internacional'),
('tapas_bar', 'comida espanola', 'comida espanola', 'es-MX', 'MX', 80, 'Busqueda internacional'),

-- SHAWARMA / KEBAB / DONER
('kebab_shop', 'shawarma', 'shawarma', 'es-MX', 'MX', 95, 'Busqueda comun moderna'),
('kebab_shop', 'kebab', 'kebab', 'es-ES', 'ES', 92, 'Busqueda europea'),
('kebab_shop', 'doner', 'doner', 'es-ES', 'ES', 90, 'Variante comun'),
('kebab_shop', 'gyros', 'gyros', 'en-US', 'US', 82, 'Equivalencia cercana'),
('kebab_shop', 'comida arabe', 'comida arabe', 'es-MX', 'MX', 86, 'Intencion generica'),

-- CAFE
('coffee_shop', 'cafe', 'cafe', 'es-MX', 'MX', 95, 'Busqueda base'),
('coffee_shop', 'cafeteria', 'cafeteria', 'es-MX', 'MX', 94, 'Giro comun'),
('coffee_shop', 'coffee shop', 'coffee shop', 'en-US', 'US', 92, 'Busqueda en ingles'),
('coffee_shop', 'espresso bar', 'espresso bar', 'en-US', 'US', 86, 'Busqueda especializada'),
('coffee_shop', 'cafe de especialidad', 'cafe de especialidad', 'es-MX', 'MX', 90, 'Busqueda specialty coffee'),

-- SANDWICH / TORTA
('sandwich_shop', 'sandwich', 'sandwich', 'es-MX', 'MX', 88, 'Forma general'),
('sandwich_shop', 'torta', 'torta', 'es-MX', 'MX', 95, 'Mexico'),
('sandwich_shop', 'bocadillo', 'bocadillo', 'es-ES', 'ES', 92, 'Espana'),
('sandwich_shop', 'sanduche', 'sanduche', 'es-CO', 'CO', 90, 'Colombia'),
('sandwich_shop', 'emparedado', 'emparedado', 'es-PR', 'PR', 82, 'Busqueda menos frecuente'),
('sandwich_shop', 'sub', 'sub', 'en-US', 'US', 84, 'Busqueda estadounidense'),
('sandwich_shop', 'hoagie', 'hoagie', 'en-US', 'US', 80, 'Regional USA'),

-- DUMPLINGS
('dumpling_shop', 'dumplings', 'dumplings', 'en-US', 'US', 92, 'General'),
('dumpling_shop', 'gyoza', 'gyoza', 'ja-JP', 'JP', 95, 'Japon'),
('dumpling_shop', 'momo', 'momo', 'en-IN', 'IN', 90, 'Himalaya / India'),
('dumpling_shop', 'mandu', 'mandu', 'ko-KR', 'KR', 90, 'Corea'),
('dumpling_shop', 'pierogi', 'pierogi', 'pl-PL', 'PL', 88, 'Europa del Este'),
('dumpling_shop', 'wonton', 'wonton', 'zh-CN', 'CN', 88, 'China'),

-- PARRILLA / BBQ
('grill_house', 'parrilla', 'parrilla', 'es-AR', 'AR', 95, 'Argentina'),
('grill_house', 'asado', 'asado', 'es-UY', 'UY', 94, 'Uruguay / Argentina'),
('grill_house', 'churrasco', 'churrasco', 'es-BR', 'BR', 92, 'Brasil / LatAm'),
('grill_house', 'steakhouse', 'steakhouse', 'en-US', 'US', 88, 'Equivalencia inglesa'),
('grill_house', 'barbecue', 'barbecue', 'en-US', 'US', 86, 'USA'),
('grill_house', 'bbq', 'bbq', 'en-US', 'US', 85, 'Abreviacion'),

-- STREET FOOD
('street_food', 'food truck', 'food truck', 'en-US', 'US', 94, 'Busqueda internacional'),
('street_food', 'street food', 'street food', 'en-US', 'US', 92, 'Busqueda global'),
('street_food', 'puesto de comida', 'puesto de comida', 'es-MX', 'MX', 88, 'Mexico'),
('street_food', 'warung', 'warung', 'id-ID', 'ID', 86, 'Indonesia'),
('street_food', 'hawker stall', 'hawker stall', 'en-SG', 'SG', 88, 'Singapore / Asia'),

-- RAMEN / SUSHI / JAPAN
('ramen_shop', 'ramen', 'ramen', 'ja-JP', 'JP', 96, 'Busqueda principal'),
('ramen_shop', 'ramen shop', 'ramen shop', 'en-US', 'US', 92, 'Busqueda internacional'),
('sushi_bar', 'sushi', 'sushi', 'ja-JP', 'JP', 96, 'Busqueda principal'),
('sushi_bar', 'sushi bar', 'sushi bar', 'en-US', 'US', 93, 'Busqueda internacional'),
('izakaya', 'izakaya', 'izakaya', 'ja-JP', 'JP', 95, 'Giro japones'),

-- ITALIA / FRANCIA
('italian_restaurant', 'trattoria', 'trattoria', 'it-IT', 'IT', 94, 'Italia'),
('italian_restaurant', 'osteria', 'osteria', 'it-IT', 'IT', 92, 'Italia'),
('italian_restaurant', 'pizzeria', 'pizzeria', 'it-IT', 'IT', 90, 'Global'),
('french_restaurant', 'bistro', 'bistro', 'fr-FR', 'FR', 92, 'Francia'),
('french_restaurant', 'brasserie', 'brasserie', 'fr-FR', 'FR', 90, 'Francia'),
('bakery', 'boulangerie', 'boulangerie', 'fr-FR', 'FR', 92, 'Panaderia francesa')

ON CONFLICT DO NOTHING;

-- Verificacion rapida
SELECT category_id, COUNT(*) AS total_terms
FROM category_synonyms
GROUP BY category_id
ORDER BY total_terms DESC, category_id;

