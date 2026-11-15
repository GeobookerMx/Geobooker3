# SEO, AEO y números internacionales — 15 de noviembre de 2026

## WhatsApp

El texto `Numero invalido... No se conto como enviado` sale de `WhatsAppService.sendMessage`, antes de abrir WhatsApp o registrar el intento. La validación anterior interpretaba el número mediante libphonenumber pero, si el análisis devolvía `false`, no probaba la normalización alternativa que sí usaban otros recorridos. La normalización podía aceptar simplemente una longitud de 10 a 15 cifras. Esto hacía que un destino aceptado por un recorrido fuera rechazado por otro. Además había dos listas distintas para inferir países y la respuesta de Apify descartaba `countryCode` y `phoneUnformatted`.

Se implementó un único normalizador con libphonenumber para validar y construir el destino E.164. Admite prefijos internacionales explícitos, números con código de país sin `+`, `00`, extensiones y el formato móvil mexicano antiguo. Un número nacional requiere contexto de país. Los números que no pasan una validación real ya no se aceptan solo por longitud. Apify conserva país y ciudad cuando están presentes, y sus pantallas dan prioridad al país del registro. El historial también utiliza ese país antes de inferirlo por ubicación.

La consulta de producción fue de solo lectura y resumió formatos sin extraer teléfonos completos. Encontró formatos internacionales y nacionales de Estados Unidos, Canadá, España, Reino Unido, Francia, Alemania, Países Bajos, Chequia, Emiratos y otros mercados. Existen registros sin país y algunos con longitud dudosa. No se alteraron registros históricos ni se inventaron dígitos para completar destinos.

La corrección del formato no demuestra que el número tenga cuenta WhatsApp. Este recorrido abre WhatsApp para completar el mensaje; no es una confirmación de entrega de Cloud API. La aplicación todavía registra la apertura mediante su mecanismo heredado de contadores: esa métrica no debe interpretarse como entrega confirmada. No se enviaron mensajes en esta revisión.

## SEO y AEO

El adjunto mezcla mejoras útiles con afirmaciones que no deben usarse como promesas. [Google documenta](https://developers.google.com/search/docs/appearance/ai-features) que las prácticas de SEO siguen siendo relevantes para sus funciones de IA y que `llms.txt` no mejora ni perjudica la visibilidad en Google. Sus [actualizaciones de documentación](https://developers.google.com/search/updates) informan la retirada de los resultados enriquecidos FAQ. [Applebot-Extended](https://support.apple.com/en-bn/119829) controla usos de contenido y no rastrea páginas por sí mismo. Permitirlo no garantiza exposición en Apple Intelligence.

La carpeta local ya contenía trabajo previo en Netlify, robots, documentación IA, schema y páginas empresariales; se conservó. La biblioteca ya tenía renderizado Edge escrito y ahora su configuración local incluye `/biblioteca` y `/biblioteca/*`. No es un renderizado del texto íntegro de cada guía: contiene título, resumen y enlaces a PDF.

Cambios de esta revisión:

- `/llms-full.txt` transmite `full=1` al generador. La versión completa incorpora guías y respuestas adicionales; la corta funciona como índice.
- Las descripciones de GeoScore y Connect se alinearon con análisis de mercado y servicio B2B gestionado, sin prometer verificación de legitimidad o reputación ni reclamación instantánea.
- Los grupos de robots permiten la documentación completa y excluyen también las raíces `/admin` y `/dashboard`.
- Se sincronizaron las copias estáticas de robots y llms con el generador.
- Una guía inexistente devuelve HTTP 404 y `noindex`, en lugar de una copia del índice con HTTP 200. Las respuestas PDF pasan sin cambios.
- La descripción estructurada de GeoScore se ajustó para reflejar análisis de ubicación y cobertura disponible.

Se implementaron páginas `/ciudad/{ciudad}/{categoría}` para ocho ciudades y trece categorías. Comparten selección de registros públicos aprobados en México entre el servidor y la interfaz; incluyen listado HTML inicial, enlaces de perfiles, canonical, descripción e ItemList. El sitemap incorpora automáticamente solo combinaciones con perfiles aptos. Las combinaciones vacías devuelven `noindex`; una falla del origen devuelve 503 y una ruta desconocida 404. En la consulta actual no hubo candidatos aprobados ni negocios con ciudad y slug que cumplieran los requisitos; no se alteró la moderación para rellenar páginas. [Google describe](https://developers.google.com/search/docs/essentials/spam-policies) los problemas de páginas de entrada y generación masiva sin valor. Tampoco se afirmó un plazo garantizado de indexación ni el porcentaje de búsquedas en chatbots que menciona el adjunto sin fuente.

## Verificación y publicación

`npm run build` pasó; permanecen advertencias de tamaño de bundles y de dependencias anteriores. ESLint de los archivos de WhatsApp y nuevas páginas pasó sin errores. Pasaron dos pruebas de teléfonos, tres de documentación/robots/biblioteca y tres de GeoSEO (visibilidad pública, canonical, HTML seguro y estados de error); `git diff --check` pasó. La compilación requirió ejecutarse fuera del sandbox porque esbuild devolvía `spawn EPERM` dentro de él. La biblioteca ahora transforma HTML con APIs estándar, sin depender de un `HTMLRewriter` global ausente en Node/Edge.

El usuario autorizó el commit y la publicación en producción el 15 de noviembre. El conjunto de publicación incluye SEO/AEO, sus dependencias de páginas empresariales y la corrección de WhatsApp; preserva otros cambios locales ajenos al despliegue. Falta comprobar en una sesión autenticada el recorrido de WhatsApp con un destinatario controlado. No se modificó la configuración de Resend ni se enviaron mensajes de prueba.
