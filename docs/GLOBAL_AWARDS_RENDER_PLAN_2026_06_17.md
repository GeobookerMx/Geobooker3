# Global Awards Render Plan

## Objetivo

Preparar Geobooker para renderizar restaurantes premiados en Mexico y fuera de Mexico sin reestructurar el mapa ni el buscador cada vez que entre una nueva guia editorial.

## Estado actual

- Seed real preparado para los 29 restaurantes MICHELIN Mexico 2026:
  - [data/seed/awards/michelin_mexico_2026.json](/c:/Users/juanpablo/Geobooker3/data/seed/awards/michelin_mexico_2026.json)
  - [supabase/seed_michelin_mexico_2026_staging.sql](/c:/Users/juanpablo/Geobooker3/supabase/seed_michelin_mexico_2026_staging.sql)
- Plantilla global de expansion preparada para ciudades internacionales:
  - [data/seed/awards/global_awards_expansion_template.json](/c:/Users/juanpablo/Geobooker3/data/seed/awards/global_awards_expansion_template.json)

## Logica de render global

La misma capa debe funcionar para:

- MICHELIN Mexico
- MICHELIN Europa
- MICHELIN Asia
- guias editoriales locales
- listas curatoriales futuras de Geobooker

### Campos minimos para mapa

- `name`
- `country`
- `state`
- `city`
- `address`
- `award_source`
- `award_name`
- `award_year`
- `award_level`
- `green_award`
- `badge_text`
- `icon_key`
- `verification_status`

### Traduccion de UI por tipo de premio

- `gold_star`: 1 estrella o premio premium
- `gold_double_star`: 2 estrellas o nivel superior
- `gold_star_green_leaf`: estrella + sostenibilidad
- futuro:
  - `bib_gourmand`
  - `world_50_best`
  - `editor_choice`

## Expansion internacional

### Fase A

- Mexico 2026 completamente sembrado.
- Geocodificacion manual o automatizada antes de publicar.
- Match contra `businesses` para evitar duplicados.

### Fase B

- Paris
- Tokyo
- New York City
- Barcelona
- Lima

En esta fase el repo ya incluye plantillas de render y busqueda, pero no publica negocios internacionales hasta que se verifiquen sus datos reales.

### Fase C

- Londres
- Madrid
- Seul
- Estambul
- Singapur
- Dubai

## Reglas de calidad

- No usar logo oficial de MICHELIN.
- Siempre guardar `source_url`.
- Siempre guardar `last_verified_at`.
- Si hay varias sucursales, la premiada debe vincularse de forma individual.
- No publicar plantillas `needs_review` como si fueran datos verificados.

## Integracion con busqueda

El buscador debe reconocer:

- `michelin near me`
- `fine dining in paris`
- `alta cocina en barcelona`
- `tasting menu tokyo`
- `restaurante premiado lima`
- `green star restaurant madrid`

## Siguiente paso tecnico recomendado

1. Ejecutar `create_business_awards_system.sql`.
2. Ejecutar `seed_michelin_mexico_2026_staging.sql`.
3. Geocodificar staging.
4. Crear o vincular negocios en `businesses`.
5. Insertar registros finales en `business_awards`.
6. Exponer un filtro publico `awardFilter` por ciudad y pais.

