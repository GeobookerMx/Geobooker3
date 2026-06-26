# Geobooker Business Knowledge Graph - Fase 1

## Objetivo
Crear la base estructural para que Geobooker evolucione de directorio a motor de busqueda semantica local con SEO programatico disciplinado.

## Alcance de esta fase
- Categorias canonicas multilenguaje.
- Alias, modismos, typos y traducciones.
- Intenciones de busqueda.
- Landing pages SEO administrables.
- Mapeo negocio -> categoria canonica.
- Logs de busqueda.
- RPC de resolucion semantica y busqueda de negocios.

## SQL a aplicar
1. supabase/business_knowledge_graph_phase1.sql
2. supabase/business_knowledge_graph_seed_core.sql

## Resultado esperado
- Resolver consultas como 'talacha', 'llanta ponchada', 'cerrajero urgente', 'comida cerca de mi', 'pharmacy near me'.
- Mantener compatibilidad con el buscador actual.
- Preparar el admin para evolucionar a un modulo SEO / Catalogo.

## Siguientes pasos recomendados
1. Poblar business_category_mappings para negocios existentes.
2. Conectar search_logs desde frontend o edge function.
3. Crear modulo admin para categorias, alias e intenciones.
4. Generar primeras landing pages indexables solo donde haya inventario real.
5. Medir consultas sin resultados y ampliar el grafo.

## Accion importante
Sin mappings en business_category_mappings, la RPC nueva puede resolver la categoria pero no siempre devolvera negocios canonicos. Por eso conviene hacer una primera clasificacion masiva por categoria/subcategoria actual.
