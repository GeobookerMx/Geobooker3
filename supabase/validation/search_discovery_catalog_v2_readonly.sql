-- Search Discovery V2 — validacion READ ONLY.
-- Ejecutar despues de 20260921090000_search_discovery_catalog_v2.sql.

SELECT
  COUNT(*) FILTER (WHERE slug IN (
    'mexican-restaurant', 'car-wash', 'computer-store', 'computer-repair',
    'furniture-store', 'appliance-store', 'appliance-repair', 'glass-mirror-shop'
  )) AS expected_categories,
  COUNT(*) FILTER (WHERE slug IN (
    'mexican-restaurant', 'car-wash', 'computer-store', 'computer-repair',
    'furniture-store', 'appliance-store', 'appliance-repair', 'glass-mirror-shop'
  ) AND is_active) AS active_categories
FROM public.business_categories;

SELECT
  language,
  COUNT(*) AS aliases
FROM public.business_category_aliases
WHERE alias_normalized IN (
  'tyres', 'tire shop', 'mexican food', 'car wash', 'computer repair',
  'furniture store', 'refrigerator repair', 'mirror shop'
)
GROUP BY language
ORDER BY language;

SELECT
  query,
  country,
  language,
  resolved.category_slug,
  resolved.match_source,
  resolved.weight
FROM (
  VALUES
    ('tyres', 'CA', 'en'),
    ('Mexican food', 'CA', 'en'),
    ('computer repair', 'US', 'en'),
    ('muebleria', 'MX', 'es'),
    ('refrigerator repair', 'GB', 'en'),
    ('espejos a medida', 'MX', 'es')
) AS cases(query, country, language)
CROSS JOIN LATERAL public.resolve_business_search_term(
  cases.query,
  cases.country,
  cases.language
) AS resolved
ORDER BY query, resolved.weight DESC;

SELECT
  has_function_privilege('anon', 'public.resolve_business_search_term(text,text,text)', 'EXECUTE') AS anon_resolve_execute,
  has_function_privilege('authenticated', 'public.resolve_business_search_term(text,text,text)', 'EXECUTE') AS authenticated_resolve_execute,
  has_function_privilege('anon', 'public.search_businesses_knowledge_graph(text,text,text)', 'EXECUTE') AS anon_search_execute,
  has_function_privilege('authenticated', 'public.search_businesses_knowledge_graph(text,text,text)', 'EXECUTE') AS authenticated_search_execute;

