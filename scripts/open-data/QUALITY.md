# Calidad y trazabilidad del inventario abierto

DENUE sirve para establecimientos de México y sus identificadores/actividades oficiales; Overture aporta lugares de otros países. Se conservan sus identidades y ediciones. Publicar una ficha no acredita que el propietario la haya verificado ni que haya aceptado campañas.

## Revisar un CSV DENUE sin credenciales

```bash
node scripts/import-denue-geoscore.mjs --dry-run --file=/ruta/denue_datos.csv --limit=5000 --report=.cache/denue-quality.json --provenance-output=.cache/denue-sources.jsonl
```

Usar `--encoding=utf8` si el archivo está en UTF-8; el valor predeterminado es latin1. La revisión no conecta a Supabase. El reporte incluye avisos, rechazos, duplicados potenciales, cobertura de teléfono/web y checksum SHA-256 del archivo completo. La muestra corresponde a los primeros registros elegibles del archivo: no representa estadísticamente al país ni a toda la ciudad.

La salida de procedencia contiene identificador DENUE, CLEE, código SCIAN y edición declarada; no contiene teléfonos ni correos. Un texto de edición aportado por el operador no se marca como comprobado automáticamente. El importador conserva los identificadores `denue-mx-ID` y omite IDs repetidos. Las coincidencias por nombre/dirección/coordenadas se reportan para revisión; no se fusionan automáticamente.

Aplicar sigue requiriendo `--apply --source-release=EDICION_COMPROBADA` y credenciales privadas de Geobooker. Los registros nuevos quedan ocultos; `--publish` es explícito. El conflicto por identificador conserva la ficha existente, incluidos los cambios de su propietario. Aún no existe una conciliación automática entre DENUE, Overture y fichas nativas.

## Preparar un lote Overture

```bash
python scripts/international/prepare-market-batch.py --area=es-barcelona --limit=1000 --release=2026-10-21.0 --output=.cache/barcelona.sql --report=.cache/barcelona-quality.json
```

Usar una edición publicada y comprobada, un mercado habilitado y su geometría aprobada. El comando conserva el SQL, un reporte y un archivo `.sources.jsonl` con la procedencia por registro y checksum. Generar el lote no sube datos.

Se rechazan identificadores vacíos, puntos inválidos/fuera del bbox, confianza fuera de rango o inferior a 0.75 y estados de cierre conocidos. Se admiten la taxonomía actual y contactos simples o estructurados. La confianza original se conserva; expresa certeza de existencia, no calidad comercial ni apertura en este instante. El SQL añade edición/confianza y mantiene ocultas las fichas nuevas. El auditor acepta tanto los SQL anteriores de 27 columnas como los nuevos con procedencia.

## Actualización y enriquecimiento posteriores

Para muestras de 1,000 registros ya extraídas, `prepare-reviewed-import.py --manifest=ARCHIVO.json` comprueba el checksum y el contenido y genera `.records.json` y `.review.json`. `node scripts/international/import-reviewed-batch.mjs --manifest=ARCHIVO.review.json` valida sin escribir. Añadir `--apply --env-file=RUTA_PRIVADA` carga en el proyecto Geobooker únicamente fichas nuevas, siempre ocultas; la clave de servidor nunca debe copiarse al código ni a la conversación. La publicación es un paso separado y requiere la aprobación indicada en el manifiesto. No se debe presentar una aprobación para preview como verificación independiente de ubicación.

1. Medir cobertura por ciudad/categoría y priorizar huecos reales.
2. Confirmar edición y licencias de cada fuente; conservar proveedor e identificadores.
3. Comparar por identidad, nombre/dirección y distancia, conservando las sucursales diferentes.
4. Proponer cambios por campo, con prioridad para información validada por el propietario. No reemplazar sus datos mediante una importación masiva.
5. Publicar bloques revisados y repetir las consultas del mapa bajo permisos de usuario.

No inventar horarios, fotos, reseñas, teléfonos o estado abierto. Los datos públicos de contacto no se utilizan como consentimiento para correo/WhatsApp.

Fuentes: [INEGI DENUE](https://www.inegi.org.mx/servicios/api-denue/), [Overture Places](https://docs.overturemaps.org/guides/places/), [esquema de Overture](https://docs.overturemaps.org/schema/reference/places/place/).
