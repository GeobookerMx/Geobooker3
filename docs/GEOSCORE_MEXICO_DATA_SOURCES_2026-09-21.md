# GeoScore — fuentes de datos México

Fecha: 2026-09-21  
Estado: catálogo de decisión; requiere validación legal final antes de producción

## Matriz de fuentes

| Fuente | Uso GeoScore V1 | Estrategia | Riesgo/control |
|---|---|---|---|
| INEGI DENUE | Competidores, complementarios, actividad SCIAN, tamaño y ubicación | Carga versionada por zona + consultas puntuales; conservar CLEE/ID y fecha | Datos no equivalen a demanda ni garantizan que el negocio siga activo. |
| INEGI Censo 2020, AGEB/manzana urbana | Población y contexto sociodemográfico agregado | Snapshot territorial; joins point-in-polygon | No presentar como población actual exacta; indicar año y cobertura. |
| SICT Datos Viales | Accesibilidad y TDPA en red carretera donde haya cobertura | Capa secundaria y no universal | No convertir TDPA en tráfico peatonal ni extrapolar a calles sin medición. |
| Overture Places | Enriquecimiento y expansión internacional futura | GeoParquet por zona; GERS ID, confianza y taxonomy | Deduplicar con DENUE; fijar versión y adaptar el cambio de taxonomía 2026. |
| OpenStreetMap | Red peatonal/carretera, equipamiento y ruteo | Extractos/servicio propio o proveedor; atribución visible | ODbL; no usar API pública Nominatim para bulk/autocomplete. |
| Geobooker Businesses | Negocios verificados y categorías propias | Fuente prioritaria interna con procedencia | No contar dos veces registros fusionados con DENUE/Overture. |
| Geobooker Search/Intent | Señal agregada futura | Fuera de V1; sólo grupos con umbral de privacidad | Nunca seguimiento individual invasivo. |

## Reglas de ingestión

Cada lote deberá registrar:

- `source_name`, `source_version` y URL de origen;
- fecha de publicación, descarga e importación;
- país y cobertura geográfica;
- licencia/atribución y obligaciones;
- checksum del archivo;
- conteos crudo, válido, rechazado, duplicado y publicado;
- transformaciones y versión del mapping;
- responsable y resultado de validación.

El dato crudo se conserva en staging con acceso backend/admin; el producto consume una representación normalizada y deduplicada.

## Identidad y deduplicación

Orden de evidencia sugerido:

1. Identificador estable de fuente: CLEE/ID DENUE, GERS ID u otro.
2. Teléfono normalizado, dominio y sitio oficial.
3. Nombre normalizado + categoría + distancia geográfica.
4. Dirección normalizada y coincidencia administrativa.

Las coincidencias probables no deben fusionarse automáticamente cuando cambien identidad, categoría o datos de contacto. Se genera un candidato para revisión.

## Taxonomía inicial

La categoría propia de Geobooker será la autoridad de producto. SCIAN y Overture funcionarán como taxonomías externas mapeadas y versionadas.

Perfiles piloto:

- `cafe`: cafeterías como competencia; oficinas, escuelas, transporte y comercio de proximidad como complementarios candidatos.
- `pharmacy`: farmacias como competencia; clínicas, hospitales, consultorios y población residencial como señales contextuales.
- `car_wash`: autolavados como competencia; talleres, gasolineras, vialidades y parque vehicular/flujo disponible como señales contextuales.

Cada mapping requiere `source_taxonomy`, `source_code`, `geobooker_category_id`, confianza, vigencia y revisión humana.

## Uso de Overture en 2026

No construir sobre el campo legado `categories` como dependencia permanente. El adaptador deberá leer `basic_category` y `taxonomy` y mantener compatibilidad temporal mientras Overture retira el campo anterior.

## Geocodificación

- No integrar el Nominatim público como autocompletado para usuarios.
- No hacer consultas sistemáticas o masivas contra el servicio público.
- Para el piloto: caché, rate limit, identificación de aplicación y proveedor intercambiable.
- Para producción: proveedor con SLA o instancia propia.

## Pruebas de cobertura antes de Fase 3

Usar una muestra reproducible de:

- Ciudad de México: zonas densas y mixtas.
- Guadalajara: tejido comercial consolidado.
- Monterrey: movilidad principalmente vehicular.
- Una ciudad media y una periferia con menor cobertura.

Medir por vertical:

- POI válidos por km²;
- porcentaje con categoría mapeada;
- duplicados DENUE/Overture/Geobooker;
- antigüedad del dato;
- geometrías fuera de México o inválidas;
- concordancia manual sobre al menos 100 registros por ciudad.

## Fuentes oficiales consultadas

- INEGI, API DENUE: https://www.inegi.org.mx/servicios/api_denue.html
- INEGI, descriptor Censo 2020 por AGEB/manzana: https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/fd_agebmza_urbana_cpv2020.pdf
- SICT, Datos viales: https://www.datos.gob.mx/es/dataset/datos_viales
- Overture Places: https://docs.overturemaps.org/guides/places/
- OpenStreetMap, licencia: https://www.openstreetmap.org/copyright
- Nominatim, política de uso: https://operations.osmfoundation.org/policies/nominatim/
- H3: https://h3geo.org/docs/
- Supabase, extensiones/PostGIS: https://supabase.com/docs/guides/database/extensions

