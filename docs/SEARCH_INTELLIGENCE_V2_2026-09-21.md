# Geobooker Search Intelligence V2

Fecha: 2026-09-21  
Estado: primera capa implementada localmente; migración preparada, no aplicada en producción

## Objetivo

Convertir una consulta de lenguaje cotidiano en hasta 20 negocios realmente relacionados, priorizados por relevancia, distancia, calidad y disponibilidad de datos.

Ejemplos:

- `tyres` en Canadá o Reino Unido -> llanteras, reparación de neumáticos y, como alternativa secundaria, autopartes.
- `Mexican food` en Canadá -> restaurantes mexicanos, taquerías y cocina mexicana.
- `refrigerator repair` -> reparación de electrodomésticos antes que tiendas generales.
- `mirrors` -> tiendas de espejos/vidrio; mueblerías sólo como fallback relacionado.
- `garage` -> taller o estacionamiento según términos adicionales y contexto.

## Flujo

```text
consulta
 -> normalización Unicode
 -> idioma de la consulta
 -> intención y entidad/producto
 -> categorías canónicas y categorías relacionadas
 -> país/ciudad/coordenadas
 -> fuentes disponibles
 -> deduplicación
 -> ranking
 -> máximo 20 resultados con explicación de relación
```

## Fuentes y precedencia

1. Negocios propios/verificados de Geobooker.
2. Catálogo internacional normalizado de Overture/DENUE u otra fuente licenciada.
3. Proveedor on-demand autorizado, con ubicación del mercado seleccionado.
4. Resultado vacío explicable cuando no exista cobertura; nunca completar con otra ciudad o negocios irrelevantes.

“20 resultados” significa **hasta 20 relevantes**. El sistema no inventará ni rellenará resultados sólo para alcanzar el número.

## Ranking V2 propuesto

| Señal | Peso máximo |
|---|---:|
| Coincidencia exacta con producto/servicio/intención | 40 |
| Coincidencia con categoría primaria | 25 |
| Distancia o pertenencia al mercado elegido | 15 |
| Verificación/calidad y actualidad | 10 |
| Disponibilidad de contacto/ficha | 5 |
| Relación secundaria | 5 |

Premium o publicidad nunca debe convertir un resultado no relevante en relevante. Los espacios patrocinados deben etiquetarse y conservar un umbral mínimo de coincidencia.

## Primera cobertura implementada

- Tyres/tires/llantas/neumáticos.
- Mexican food/restaurante mexicano/taquería.
- Car wash/autolavado/detailing.
- Garage/taller/estacionamiento relacionado.
- Computer sales/repair/componentes.
- Furniture/mueblería/salas/comedores.
- Appliances/refrigeradores/reparación.
- Mirrors/vidrio/vidriería.

Idiomas iniciales: español e inglés. El modelo de datos admite aliases por idioma y país; francés, portugués, alemán, japonés y otros deben añadirse mediante paquetes revisados, no traducción automática sin control.

## Cambios técnicos realizados

- Coincidencia por límites de palabra para evitar falsos positivos (`tire` ya no coincide dentro de `entire`).
- Detección básica del idioma de consulta independiente del idioma del dispositivo.
- Consulta original preservada para el Knowledge Graph; los fallbacks ya no se concatenan en una cadena que reduzca similitud.
- Variantes y categorías del proveedor ampliadas.
- Resultados del proveedor limitados a 20 después de deduplicar.
- Una búsqueda explícita en otro mercado ya no cae silenciosamente en la ubicación física del usuario.
- Migración idempotente preparada para categorías, aliases e intenciones.

## Pendientes antes de producción

1. Aplicar la migración en preview y verificar funciones/tablas reales.
2. Incorporar coordenadas canónicas de ciudades para evitar depender del GPS al buscar otro mercado.
3. Importar cobertura Overture por mercados, con manifests, licencias y deduplicación.
4. Añadir relaciones explícitas categoría-producto y no depender indefinidamente de arrays del cliente.
5. Telemetría de zero-results, reformulaciones, clic/contacto y precisión manual.
6. Pruebas con al menos 100 consultas por mercado y matriz de idiomas.
7. Mover consultas pagadas/proveedor a backend para proteger claves, cuotas y controles de costo.

La promoción pública de mercados queda automatizada con
`npm run markets:public`: sólo publica mercados `active` con registros, área
revisada y bounding box válido. Los estados `candidate`, `planned`, `qa` y
`preview` permanecen fuera de la PWA.

Después de aplicar el catálogo en preview, ejecutar exclusivamente la validación
read-only `supabase/validation/search_discovery_catalog_v2_readonly.sql`.

## Release gate

Search V2 puede incorporarse al release estable sólo cuando:

- las consultas internacionales nunca mezclen mercados;
- P95, errores y cuotas estén monitorizados;
- no haya secretos del proveedor en el bundle;
- resultados patrocinados estén identificados;
- attribution/licensing sea visible;
- las pruebas Web, Android e iOS produzcan resultados equivalentes;
- exista rollback mediante feature flag server-side.
