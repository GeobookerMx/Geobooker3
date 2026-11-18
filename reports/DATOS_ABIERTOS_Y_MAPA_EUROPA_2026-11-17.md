# Datos abiertos y mapa de Europa — 17/11/2026

Actualización posterior: [expansión de ocho ciudades](OVERTURE_EXPANSION_2026-11-17.md). Ese reporte documenta las nuevas importaciones y su publicación preliminar autorizada; los resultados siguientes corresponden a la primera entrega de este día.

## Cambios de producción comprobados

- El RPC del mapa `businesses_in_bounds` consultaba fichas nativas y candidatos DENUE; no leía `international_businesses`. Madrid devolvía cero resultados aunque tenía 1000 registros públicos.
- Se incorporó Overture a la consulta mediante `SECURITY INVOKER`, conservando RLS, filtros de aprobación, visibilidad, estado activo, categoría, bbox y límite máximo de 500 resultados. Se excluye de esa nueva rama la segunda copia DENUE para evitar duplicar el inventario mexicano que ya está en candidatos.
- Se corrigió la política administrativa de `business_candidates` que aplicaba a `public` y hacía que anon intentara consultar la tabla privada de administradores. Ahora se aplica solo a authenticated; las condiciones de pertenencia siguen intactas. No se concedió acceso anónimo a administradores ni se desactivó RLS.
- Barcelona y Londres ya tenían aprobación de mercado para preview. Se hicieron visibles exactamente 1000 registros existentes de cada ciudad, tras comprobar nombre/dirección, bbox y duplicados exactos. No se crearon negocios nuevos ni se modificaron propietarios, reclamos o verificaciones.
- Las filas publicadas indican edición Overture 2026-08-19.0. Se corrigió el metadato de esos dos mercados para reflejar esa edición; no se presentan como datos de octubre ni como información en tiempo real.

| Ciudad | Inventario visible tras el cambio |
| --- | ---: |
| Madrid | 1000 |
| Barcelona | 1000 |
| Londres | 1000 |
| Lisboa | 25 |

Viena, Bruselas y Estocolmo conservan 1000 registros ocultos cada una: sus mercados están en QA sin aprobación de publicación. Ampliar cobertura de París, Berlín, Roma, Milán y Ámsterdam requiere preparar lotes y revisar sus fuentes/geometrías; no se afirma que se hayan importado en esta entrega.

Las consultas con rol anon devolvieron 50 resultados solicitados para Madrid, Barcelona y Londres; el filtro restaurantes funcionó y Bruselas siguió sin devolver su inventario oculto. El directorio administrativo permaneció privado. Estos son datos de directorio, no negocios reclamados por usuarios.

## DENUE existente y mejoras del importador

Hay 3,396,670 candidatos DENUE en `business_candidates` y otra colección de 460,762 filas DENUE en `international_businesses`. La segunda corresponde a alcaldías de CDMX y no representa todo México. No se deben sumar ambas colecciones como establecimientos únicos.

El importador ahora puede revisar archivos sin claves ni conexión a Supabase, admite CSV con BOM, comillas escapadas y saltos de línea, valida identificadores/coordenadas/localidad y normaliza teléfonos sin duplicar +52. Los enlaces inválidos se omiten con aviso. Se conserva un manifiesto por registro con CLEE/SCIAN y un resumen con checksum.

Una revisión local de los primeros 5000 registros preparó 5000 fichas, encontró 1 web inválida y 9 coincidencias potenciales por ubicación/nombre/dirección. No hubo escrituras en base de datos y la edición del CSV sigue sin comprobarse. Es una muestra ordenada del archivo, concentrada en la categoría amplia servicios, no una evaluación nacional. Las coincidencias requieren revisión y no se fusionaron.

## Overture y límites

Se reforzaron filtros de coordenadas, bbox, identidad, cierres y confianza, y la normalización de contactos. Los nuevos lotes conservan confianza/edición y un manifiesto de fuentes. El SQL continúa ocultando las filas nuevas y evitando sobrescribir registros existentes.

11 pruebas locales (6 Node, 5 Python) pasan; cubren revisiones sin credenciales, CSV multilínea, duplicados de identidad, contactos, datos geográficos, cierres y compatibilidad del SQL nuevo/anterior. El workflow correspondiente verifica estos casos sin credenciales productivas.

Las mejoras de los importadores afectan los siguientes lotes, no corrigen retroactivamente todo el catálogo. No se hizo una descarga nueva masiva, una verificación comercial de cada negocio ni una conciliación automática entre fuentes. La fecha de origen, el estado abierto y las licencias deben seguir revisándose. No se agregaron contactos a campañas de mensajes.

## Acceso web/PWA solicitado en paralelo

PR #14 integrado en main mediante `164de0f4cf93da6495ad1146f3118937f1100deb`. Se comprobó que el bundle público incluye `geobooker_auth_destination` y el observador de sesión actualizado. La navegación de descubrimiento en geobooker.com.mx exige cuenta y conserva el destino tras autenticar. No es una restricción de confidencialidad del catálogo público ni una prueba de instalación móvil. La validación instalada de PWA/proveedores sigue siendo una comprobación de usuario.

Apple y las pruebas finales del SDK permanecen en espera. Lovia no se modificó.
