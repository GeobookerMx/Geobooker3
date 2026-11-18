# Muestras Overture publicadas — 17 de noviembre de 2026

## Resultado comprobado en producción

Se importaron y publicaron **8,000 fichas nuevas**, exactamente **1,000 por ciudad**, después de la autorización explícita del propietario para mostrarlas como muestras preliminares. Ninguna se marcó como reclamada o verificada. Cada lote conservó los identificadores de origen, edición y confianza; el importador omite los IDs ya existentes y no reemplaza cambios de propietarios.

| Ciudad nueva | País | Giros | Fichas visibles |
| --- | --- | ---: | ---: |
| Houston | Estados Unidos | 5 | 1,000 |
| Nueva York | Estados Unidos | 6 | 1,000 |
| Vancouver | Canadá | 5 | 1,000 |
| París | Francia | 6 | 1,000 |
| Berlín | Alemania | 6 | 1,000 |
| Roma | Italia | 6 | 1,000 |
| Milán | Italia | 6 | 1,000 |
| Ámsterdam | Países Bajos | 6 | 1,000 |

Houston y Vancouver tienen 200 fichas por giro: belleza, restaurantes, salud, servicios y tiendas. Las otras seis ciudades tienen 166–167 por giro y añaden hoteles. Se corrigió el reconocimiento de `lodging` en la taxonomía actual para incluirlos. La selección favorece diversidad; no representa estadísticamente toda la actividad económica de cada ciudad.

Los Ángeles y Toronto ya tenían 1,000 fichas visibles cada una: no se volvieron a importar. El resultado en Estados Unidos y Canadá es **5,000 fichas visibles en cinco ciudades**. Europa conserva Madrid, Barcelona y Londres con 1,000 cada una y Lisboa con 25; más las cinco ciudades nuevas, suma 8,025. Estos totales corresponden a filas Overture del directorio, no a registros de usuarios, instalaciones ni negocios verificados.

Miami, Viena, Bruselas y Estocolmo mantienen sus 1,000 fichas ocultas por ciudad. La revisión automática rechazó publicar Miami junto con las ocho ciudades nuevas porque la autorización explícita solo cubría estas ocho. Se excluyó Miami y la transacción de 8,000 fichas se completó correctamente. No se modificaron las otras tres ciudades en QA.

## Fuente, trazabilidad y calidad

Edición de los ocho lotes: **2026-10-21.0**, comprobada en el [calendario oficial de Overture](https://docs.overturemaps.org/release-calendar/). La edición prevista para noviembre todavía no figuraba publicada al hacer la extracción.

[Resumen de lotes](OVERTURE_MUESTRAS_2026-11-17.json): cantidades, distribución, cobertura de contacto, proveedores, licencias y SHA-256 del SQL, registros y manifiesto de procedencia. Se registraron también ocho lotes aplicados en `international_import_batches`. Los archivos completos de extracción permanecen en `.cache/batches/` y no se añadieron al repositorio.

Los controles de los 8,000 registros detectaron cero IDs repetidos, cero duplicados exactos por nombre/dirección/coordenadas redondeadas y cero coordenadas inválidas o fuera de sus bbox. Esto no descarta todos los duplicados semánticos ni prueba la precisión física de cada punto. La extracción exigió país/localidad, dirección y confianza de existencia entre 0.75 y 1, y excluyó cierres conocidos en la fuente.

Entre el 98.9% y el 100% de las fichas de cada lote tienen teléfono o web. Se revisó su formato, no su funcionamiento ni vigencia. La confianza de Overture no equivale a una valoración comercial ni prueba apertura actual. Los bbox son límites de extracción, no fronteras municipales oficiales.

La publicación es `preview`: se conserva `independentLocationVerification: false`. No se inventaron porcentajes de precisión, revisores humanos, aprobación de calidad ni validaciones de propietarios. La comprobación independiente de ubicaciones sigue pendiente antes de promover los mercados a `active` o ampliar sus lotes. `nextTargetRecords: 3000` expresa una etapa posible, sin programar nuevas importaciones automáticas.

Se añadieron un aviso público de fuentes y copias de CDLA Permissive 2.0, Apache 2.0 y CC0 1.0, siguiendo las [licencias de Places](https://docs.overturemaps.org/guides/places/). El manifiesto local conserva la procedencia por registro. Las fichas anteriores mantienen sus ediciones originales; no se actualizaron masivamente. Los datos de contacto no se incorporaron a campañas.

## Validación

- 15 pruebas pasan: 10 Node y 5 Python. Incluyen coordenadas, contactos, origen/edición, diversidad, conflictos de identidad, reejecución sin reemplazar propietarios y fallos de lote que mantienen ocultas las filas nuevas.
- `npm run build` terminó correctamente. Persisten avisos previos de tamaño de bundles, importaciones mixtas de Capacitor, uso de eval en google-libphonenumber y una referencia a pattern-dots.svg.
- La consulta del mapa con rol `anon` devolvió los 50 resultados solicitados de cada ciudad nueva; todos correspondieron a la ciudad y fuente esperadas.
- El filtro `restaurantes` devolvió 20 resultados por ciudad, sin otras categorías.
- Las consultas públicas no expusieron fichas de Miami, Viena, Bruselas ni Estocolmo.
- La publicación se ejecutó en una transacción con bloqueos y comprobaciones de 1,000 filas por ciudad, propietarios nulos, banderas, edición, identidad, dirección, bbox y duplicados. RLS y permisos administrativos se conservaron.

La prueba de la consulta no sustituye una inspección visual en cada dispositivo. El mapa aplica límites de resultados por vista, por lo que las 1,000 fichas no tienen que dibujarse simultáneamente. Los mercados siguen en preview y no se presentaron como activados en el selector comercial que solo publica mercados `active`.

## Alcance

Los datos del mapa se sirven desde Supabase y no requieren un build nativo nuevo. Se añadió al pie de la web un enlace a fuentes/licencias. No se cambió el login, ATT, SDK de Meta, TestFlight, campañas publicitarias ni Lovia.
