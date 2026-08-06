# Expansion internacional con costo controlado

## Decision

El piloto recomendado es Los Angeles (Estados Unidos), Toronto (Canada) y Madrid (Espana). Paris queda en fase 2 para validar despues el cruce con SIRENE. La expansion se hace por ciudad y por lotes de hasta 10,000 candidatos; no se replica una base mundial completa en Supabase.

## Por que estos mercados

- Estados Unidos: proximidad, mercado hispano y alto potencial para negocios y servicios locales.
- Canada: continuidad norteamericana y disponibilidad de una base abierta de Statistics Canada para validacion.
- Espana: idioma compartido y una entrada natural a la Union Europea.
- Francia: SIRENE permite una validacion oficial fuerte, pero exige mas trabajo de normalizacion y cumplimiento; por eso es fase 2.

## Fuentes sin tarifa de licencia

1. Overture Maps Places como fuente comun de descubrimiento. La publicacion de junio de 2026 supera 75 millones de lugares y se consulta por bounding box, evitando descargar el mundo completo: https://docs.overturemaps.org/guides/places/
2. Statistics Canada Open Database of Businesses para validar el piloto canadiense: https://www.statcan.gc.ca/en/lode/databases/odb
3. Census Business Builder para estadisticas de mercado de Estados Unidos; no sustituye un directorio nominal: https://www.census.gov/data/data-tools/cbb.html
4. API y archivos SIRENE para establecimientos franceses: https://www.data.gouv.fr/dataservices/api-sirene-open-data

Cada lote debe conservar `source`, version de la publicacion y licencia. No se debe publicar informacion de personas con difusion restringida ni usarla para prospeccion.

## Flujo tecnico

1. Ejecutar `scripts/international/extract-overture-places.ps1 -Area us-los-angeles`.
2. Guardar el extracto en `.cache/international`, que Git ignora y que no consume almacenamiento de Supabase.
3. Filtrar confianza minima de 0.75, nombre valido, categoria util y ubicacion dentro del area.
4. Deduplicar por identificador de fuente, telefono, dominio y distancia geografica.
5. Revisar una muestra manual de 100 registros por ciudad.
6. Subir primero 1,000 candidatos; medir busquedas, vistas, reclamos y costo durante siete dias.
7. Ampliar hasta 10,000 solo si el costo por negocio consultado y la calidad son aceptables.

## Tiempo estimado

- Correccion de consumo y embudo: 1 a 2 dias de implementacion y despliegue; 7 dias para una primera lectura y 30 dias para tendencia confiable.
- Piloto tecnico de una ciudad: 2 a 4 dias para extraccion, mapeo, deduplicacion y muestra de calidad.
- Tres ciudades: 2 a 3 semanas incluyendo revision de datos y medicion, no tres cargas simultaneas.
- Francia/SIRENE: 1 semana adicional por normalizacion y reglas de redifusion.

## Costo informatico

- Licencias de las fuentes propuestas: 0 USD, sujeto a atribucion y cumplimiento de cada licencia.
- Extraccion local con Overture y DuckDB/cliente oficial: 0 USD de software; usa la computadora y la conexion existentes.
- Supabase: 0 USD incremental esperado para el piloto si el proyecto permanece dentro de sus cuotas actuales. No puede prometerse costo cero al crecer: almacenamiento, egreso, backups y consultas aumentan con el volumen.
- Guardarrail: no mas de 10,000 candidatos por ciudad, imagenes siempre por URL y nunca copiadas a Storage, carga incremental y pausa automatica si se aproxima al 70% de la cuota contratada.

## Criterio de avance

Una ciudad avanza cuando al menos 95% de la muestra tiene nombre y ubicacion correctos, menos de 5% son duplicados visibles, y las consultas por sesion permanecen estables. Si no cumple, se corrige el mapeo antes de importar otra ciudad.
