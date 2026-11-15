# Medidas y continuidad de datos abiertos — 15 de noviembre de 2026

## Medidas prioritarias

1. Aprovechar inventario ya publicado: conectar `international_businesses` a GeoSEO con filtros de aprobación, visibilidad, país y atribución, manteniendo los estados de error y noindex para vacíos.
2. Corregir geografía y categorías antes de agregar volumen. Relacionar alcaldías de CDMX con la ciudad solo cuando `state_code=09`. Mantener separados registros de otros estados con nombres iguales.
3. Incorporar por lotes pequeños: edición comprobada, identificador estable, licencia/atribución, QA, comparación con la base, muestra de ubicaciones y publicación. Después medir consultas resueltas y perfiles usados.
4. Captar comercios para confirmar información y habilitar acciones útiles. Los datos abiertos aportan descubrimiento; no acreditan aceptación de marketing, verificación del titular ni disponibilidad en tiempo real.

## Hallazgos comprobados

- El archivo local `denue_datos.csv` tiene 460,762 registros y todos pertenecen a Ciudad de México. Las coordenadas pasan el control rectangular usado por el importador; no es una comprobación de cada ubicación física. Los registros se distribuyen entre 16 alcaldías. La edición no está acreditada por el nombre ni por la fecha local del archivo. La etiqueta anterior «2025» no debe conservarse como certeza.
- El importador anterior asignaba SCIAN 8121 a autos y 4612 a salud. [INEGI clasifica 8121](https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463909682.pdf) como belleza, baños y bolerías. Se corrigieron las categorías para futuras cargas y se añadieron pruebas; no se alteraron categorías de los registros históricos en producción.
- Overture se mantenía en configuración con edición `2026-08-19.0`. Se revisó la documentación y se preparó un lote con `2026-10-21.0`, fecha fijada explícitamente en el comando y en el informe. [La guía oficial](https://docs.overturemaps.org/getting-data/) ofrece consultas acotadas y descarga por área. La taxonomía actual reemplaza `categories` por `taxonomy`/`basic_category`; el normalizador ya usa `taxonomy` y se conserva compatibilidad con archivos anteriores.
- Las tablas de control `open_data_sources` y `open_data_import_blocks` existen en producción. La consulta no encontró bloques registrados. Los SQL y reportes locales no prueban que un lote se haya aplicado; hay que conciliar el registro de importación antes de escalar automatización.

## Trabajo realizado

GeoSEO consulta ahora también el inventario internacional publicado en México. El sitemap considera una muestra acotada de hasta 10,000 registros visibles para descubrir combinaciones, sin publicar centenares de miles de URLs por cada petición. El muestreo limita cobertura del sitemap y no reemplaza un futuro catálogo incremental completo. La prueba de solo lectura del nuevo recorrido recuperó 24 perfiles de restaurantes en CDMX, todos con atribución.

El importador DENUE queda en modo revisión por defecto. Aplicar exige una edición declarada; las filas nuevas quedan ocultas salvo publicación explícita. Se corrigió el mensaje de conteos: un upsert con duplicados omitidos no demuestra inserciones nuevas. Se validó una revisión de 100 registros sin escritura.

El extractor Overture acepta `--release` y esa versión queda en el reporte. Se actualizó la edición predeterminada de las configuraciones para nuevas extracciones, conservando los informes históricos. Se extrajeron 1,000 registros reales de Barcelona en `reports/open-data/preview-20261115-barcelona.sql` y su manifiesto JSON. Controles automáticos: 0 duplicados exactos dentro del lote, 0 coordenadas inválidas, 0 puntos fuera de bbox; 200 registros por cada una de cinco categorías de selección. Eso no demuestra ausencia de duplicados frente a la base existente ni veracidad física de todos los establecimientos. El manifiesto mantiene revisión manual requerida. No se cargó ese lote a la base ni se amplió su visibilidad.

## Fuentes recomendadas

| Fuente | Utilidad | Preparación / siguiente paso |
| --- | --- | --- |
| INEGI DENUE, México | Establecimientos, actividad, dirección, coordenadas y tamaño | Confirmar edición corregida del archivo local; obtener archivos específicos para Guadalajara/Monterrey si se priorizan. Conservar ID/CLEE y atribución |
| Overture Places | Base global de lugares | Pipeline existente; lote Barcelona actualizado preparado para QA; limitar por ciudad, categorías y confianza |
| España, censo de locales de Madrid | Locales y actividades; información administrativa para enriquecer lugares | Revisar licencia y estructura de cada recurso; relacionar identificador de local, coordenadas y estado de actividad |
| Francia, SIRENE + geolocalización INSEE | Identificación del establecimiento, actividad y geografía | Unir por SIRET; respetar difusión pública y estado; convertir coordenadas según sistema de referencia |
| data.europa.eu | Descubrir catálogos y conjuntos nacionales/municipales | Es un catálogo, no una base homogénea de todos los negocios; revisar recurso, licencia, actualización y cobertura individualmente |

Fuentes oficiales: [DENUE descarga](https://www.inegi.org.mx/app/descarga/), [corrección DENUE de julio 2026](https://inegi.org.mx/app/mapa/denue/nota.pdf), [Overture y atribuciones](https://docs.overturemaps.org/attribution/), [Madrid censo de locales](https://datos.gob.es/es/catalogo/l01280796-censo-de-locales-sus-actividades-y-terrazas-de-hosteleria-y-restauracion), [Francia: SIRENE geolocalizado](https://www.data.gouv.fr/datasets/geolocalisation-des-etablissements-du-repertoire-sirene-pour-les-etudes-statistiques), [catálogo europeo](https://data.europa.eu/).

La ficha de SIRENE indica Licence Ouverte 2.0 y coordenadas Lambert 93 para la Francia metropolitana; no deben tratarse esos X/Y como latitud/longitud WGS84. La [ficha del Annuaire des Entreprises](https://www.data.gouv.fr/datasets/donnees-des-entreprises-utilisees-dans-lannuaire-des-entreprises) anuncia que sus campos de coordenadas se retiraron en mayo de 2026: debe usarse el conjunto de geolocalización indicado, no asumir compatibilidad de un importador antiguo.

## Orden propuesto

Primero CDMX: hacer útiles los registros existentes, corregir categorías con una conciliación revisable y medir resultados de búsqueda. Segundo: terminar QA de Barcelona con el lote preparado y aplicar únicamente en revisión/invisible antes de activar el mercado. Tercero: un conector municipal de España o una muestra de SIRENE por ciudad/sector, según oportunidad comercial. No se recomienda importar Europa completa antes de validar ese primer conector y el costo de almacenamiento/actualización.
