# Geobooker Commercial Spaces MVP 2026

## Estado

Implementado localmente y desactivado por defecto. No desplegado, no migrado y no publicado.

## Alcance

- Descubrimiento de locales, oficinas, consultorios, bodegas comerciales, terrenos comerciales y espacios temporales.
- Ubicacion publica aproximada y direccion exacta privada.
- Publicacion autenticada con moderacion obligatoria.
- Solicitudes autenticadas de informacion, visita o propuesta.
- Panel del anunciante y moderacion administrativa.

Fuera de alcance: vivienda, patios de tractocamiones, reservas, cobro de renta, depositos, escrow, seguros, contratos automaticos y WhatsApp.

## Feature flag

`VITE_COMMERCIAL_SPACES_ENABLED=false`

Debe continuar en `false` hasta que la migracion y las politicas RLS pasen en un proyecto Supabase aislado.

## Orden de validacion

1. Confirmar por identificador que el proyecto Supabase no es produccion.
2. Aplicar primero las migraciones CRM/seguridad pendientes en orden cronologico.
3. Aplicar `supabase/migrations/20260814010000_commercial_spaces_mvp.sql`.
4. Ejecutar `supabase/validation/commercial_spaces_isolated_validation.sql` en modo solo lectura.
5. Probar como `anon`: solo RPC publica, sin acceso directo a tablas.
6. Probar como propietario: crear borrador, enviar a revision y leer solo sus registros.
7. Probar como otro usuario: no leer direccion, contacto, documentos ni solicitudes ajenas.
8. Probar como admin: revisar verificaciones y publicar solo con autorizacion y ubicacion verificadas.
9. Confirmar limite de cinco solicitudes por hora y ausencia de pagos/mensajeria.
10. Mantener `noindex` y la feature flag apagada hasta aprobar contenido legal, privacidad y moderacion.

## Archivos de datos

Los documentos futuros deben almacenarse en un bucket privado con URLs firmadas breves. Esta fase crea metadatos protegidos, pero deliberadamente no habilita carga documental ni crea buckets en produccion.

## WhatsApp

WhatsApp Cloud API permanece bajo kill switch. Las solicitudes de espacios no generan mensajes, plantillas, campañas ni trabajos de cola.
