# SEO Programmatic Global Plan - Geobooker

## Objetivo

Hacer que Geobooker gane visibilidad en consultas como:

- `asado en monterrey`
- `rib eye near me`
- `aguachile en cancun`
- `tacos de carnitas en michoacan`
- `lavaautos cerca de mi`
- `michelin star restaurants in mexico city`

La meta no es solo posicionar la home, sino crear una malla de URLs utiles y rastreables para:

- categoria + ciudad
- subcategoria + ciudad
- platillo o servicio + ciudad
- sinonimo o modismo + ciudad
- ingles + espanol
- busquedas con intencion local implicita (`near me`, `cerca de mi`)

## Lo que ya existe en Geobooker

- `SEO.jsx` con meta tags, canonical y schema base.
- `BusinessProfilePage.jsx` con `LocalBusiness`.
- `CityLandingPage.jsx` como base de landings locales.
- `sitemap-generator.js` para sitemap dinamico.
- `seo-business.js` para inyeccion SEO server-side en perfiles.
- `create_category_synonyms_system.sql` con sinonimos regionales.
- `denue_datos.csv` con ciudad, localidad, actividad, latitud y longitud.

## Hallazgos clave

### 1. Geobooker ya tiene base SEO, pero no escala todavia

Hoy existe infraestructura SEO, pero todavia no una arquitectura programatica masiva para miles de combinaciones utiles.

### 2. El mejor activo para escalar no es solo el contenido

Es la combinacion de:

- base de negocios
- taxonomia de categorias
- sinonimos regionales
- ciudades y localidades
- idiomas

### 3. El camino ganador no es inventar keywords

Es publicar paginas realmente utiles, con entidades reales, categorias reales y negocios reales por ciudad.

## Principios oficiales que aplican aqui

### Google Search Central

- Google recomienda pensar en las palabras que las personas realmente usarian para encontrar tu contenido.
- Para `hreflang`, cada version debe listar a las demas y a si misma.
- En `LocalBusiness`, conviene incluir propiedades requeridas y recomendadas completas.
- Para SEO local, Google dice que el ranking local depende principalmente de relevancia, distancia y prominencia.

### Google Business Profile

- La informacion completa y precisa mejora la aparicion en resultados locales.
- Resenas, enlaces y popularidad ayudan a la prominencia.

### IndexNow

- Se recomienda automatizar el envio de URLs tan pronto como el contenido se agrega, actualiza o elimina.

## Estrategia recomendada para Geobooker

## Fase 1 - Dominio tecnico e indexacion

### A. Publicar solo alternates reales

- Mantener `hreflang` solo para versiones reales equivalentes.
- Evitar declarar idiomas o regiones con query params si no existe una pagina realmente localizada.

### B. Sitemap programatico por clusters

Crear sitemaps separados por:

- negocios
- categorias
- ciudades
- categoria-ciudad
- ingles
- espanol

Idealmente con `sitemap_index.xml`.

### C. Implementar IndexNow

Enviar URLs nuevas o actualizadas cuando:

- se aprueba un negocio
- se reclama un negocio
- cambia categoria
- cambia ciudad
- se genera una landing nueva

### D. Search Console y Bing Webmaster

Monitorear:

- cobertura
- queries por pais
- queries por idioma
- paginas con impresiones sin clics
- canibalizacion entre rutas

## Fase 2 - Arquitectura de URLs para busquedas reales

### URLs base que Geobooker debe tener

- `/ciudad/monterrey`
- `/ciudad/cancun`
- `/categoria/restaurantes`
- `/categoria/lavaautos`
- `/ciudad/monterrey/restaurantes`
- `/ciudad/cancun/mariscos`
- `/ciudad/morelia/carnitas`
- `/en/cities/monterrey/restaurants`
- `/en/cities/cancun/seafood`

### URLs por sinonimos y modismos

No conviene indexar miles de aliases duplicados.

Mejor:

- tener una URL canonica por categoria
- usar sinonimos dentro del contenido, FAQ, headings y enlaces internos
- opcionalmente redirigir aliases valiosos a la URL canonica

Ejemplos:

- `talachas` -> categoria canonica `tire_service`
- `neveria` -> `ice_cream_shop`
- `lavaautos`, `autolavado`, `car wash`
- `aguachiles` -> cluster `seafood_restaurant`
- `rib eye`, `steakhouse`, `cortes finos`, `asados`

## Fase 3 - Programmatic SEO util

### Cada landing de categoria + ciudad debe incluir

- titulo exacto con ciudad y categoria
- descripcion natural y local
- lista real de negocios
- breadcrumbs
- schema `ItemList`
- FAQs cortas y utiles
- variaciones semanticas en H2
- enlaces a barrios, zonas y categorias relacionadas

### Ejemplo de intenciones a cubrir

Para `Cancun`:

- aguachile en cancun
- mariscos en cancun
- seafood in cancun
- ceviche near me

Para `Monterrey`:

- rib eye en monterrey
- cortes finos en monterrey
- steakhouse monterrey
- asado near me

Para `Michoacan`:

- tacos de carnitas en michoacan
- carnitas near me
- taquerias en morelia

## Fase 4 - Taxonomia semantica global

Crear un diccionario central con:

- categoria canonica
- sinonimos en espanol
- sinonimos en ingles
- modismos regionales
- platillos o servicios relacionados
- variantes singulares/plurales

Ejemplos:

- `seafood_restaurant`
  - marisqueria
  - cevicheria
  - aguachiles
  - seafood
  - oyster bar

- `taco_shop`
  - taqueria
  - tacos
  - carnitas
  - al pastor
  - trompo

- `car_wash`
  - autolavado
  - lavaautos
  - car wash
  - hand wash
  - detailing

## Fase 5 - Enriquecimiento de negocio

Para ganar busquedas como `rib eye near me` o `aguachile en cancun`, no basta con la categoria.

Cada negocio deberia guardar:

- categoria principal
- subcategorias
- especialidades
- platillos o servicios estrella
- atributos
- barrio o zona
- rango de precio
- idiomas

Ejemplos:

- restaurante:
  - `specialties`: `rib eye`, `picaña`, `aguachile`, `tacos de carnitas`
- car wash:
  - `services`: `detailing`, `encerado`, `aspirado`

## Fase 6 - Autoridad local y prominencia

### Para negocios reclamados

- conectar Google Business Profile
- incentivar resenas autenticas
- mantener horarios, telefono, web y direccion consistentes
- subir fotos
- responder resenas

### Para Geobooker como dominio

- conseguir enlaces locales y de medios
- enlaces desde camaras, directorios, blogs de turismo, food blogs, guias locales
- crear contenido editorial por ciudad y por tema

## Fase 7 - Expansion por idioma

No intentar traducir todo a 20 idiomas desde el dia 1.

Prioridad:

1. `es-MX`
2. `en`
3. despues paginas especificas para mercados concretos

Para Europa, Asia y USA, lo mas realista es:

- ingles como capa global
- landing pages por ciudad/mercado
- sinonimos locales por pais cuando exista suficiente inventario

## Acciones concretas recomendadas para Geobooker

### Alta prioridad

1. Crear landings `categoria + ciudad` con contenido real.
2. Conectar el sistema de sinonimos al buscador y a landings canonicas.
3. Enriquecer perfiles con especialidades y atributos buscables.
4. Usar sitemap index y sitemaps por cluster.
5. Implementar IndexNow para Bing y buscadores compatibles.
6. Medir queries reales en GSC para detectar terminos emergentes.

### Media prioridad

1. Crear FAQs por categoria y ciudad.
2. Crear hubs por cocina, servicio y zona.
3. Agregar schema `ItemList` y `FAQPage` donde aplique.
4. Generar enlaces internos automáticos entre ciudad, categoria y negocio.

### Baja prioridad por ahora

1. Multiplicar idiomas sin inventario suficiente.
2. Crear miles de paginas de alias exactos.
3. Atacar Europa y Asia con contenido vacio o traducido artificialmente.

## Datos del repo que ya pueden alimentar esta estrategia

### `denue_datos.csv`

Sirve para:

- ciudad
- municipio
- localidad
- actividad economica
- geolocalizacion

### `create_category_synonyms_system.sql`

Sirve para:

- modismos
- sinonimos regionales
- expansion semantica

### `all_cleaned.csv` y `tier_AAA.csv`

No son SEO local directo, pero pueden servir para:

- alianzas
- outreach
- backlinks
- partnerships comerciales y relaciones publicas

## Lo que no pude validar en esta ronda

- No encontre en el repo el archivo de estrellas Michelin que mencionaste.
- No pude identificar con certeza cual era el "segundo CSV" de referencia externa fuera de los CSV disponibles localmente.

Si me compartes esos archivos o sus rutas exactas, puedo incorporarlos a la taxonomia de cocina premium, fine dining y variantes internacionales.

## Siguiente implementacion recomendada

1. Crear una tabla o config central de taxonomia SEO:
   - categoria canonica
   - sinonimos
   - platillos/servicios relacionados
   - equivalentes en ingles

2. Crear una ruta programatica:
   - `/ciudad/:citySlug/:categorySlug`

3. Generar en sitemap solo combinaciones con inventario real.

4. Enriquecer cada landing con:
   - negocios reales
   - FAQ
   - `ItemList`
   - enlazado interno

5. Medir en Search Console y ampliar taxonomia segun queries reales.

## Referencias oficiales

- Google Search Central SEO Starter Guide:
  - https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central localized versions / hreflang:
  - https://developers.google.com/search/docs/specialty/international/localized-versions
- Google Search Central LocalBusiness structured data:
  - https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google Business Profile local ranking:
  - https://support.google.com/business/answer/7091
- IndexNow documentation:
  - https://www.indexnow.org/documentation
