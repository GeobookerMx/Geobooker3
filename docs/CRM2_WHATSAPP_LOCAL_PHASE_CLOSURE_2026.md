# CRM 2.0 + WhatsApp Cloud API — cierre de fase local 2026

Fecha de revisión: 2026-08-14.

## Alcance y estado

Esta fase se ejecutó exclusivamente en el worktree aislado
`Geobooker3-global-discovery-2026`, branch `agent/global-discovery-2026`.
No se ejecutó SQL, no se importaron contactos, no se enviaron mensajes, no se
configuró Meta, no se desplegó código y no se modificó producción.

Estado local: **IMPLEMENTACIÓN ESTÁTICA COMPLETA / VALIDACIÓN DE BASE PENDIENTE**.

## Componentes nuevos preparados

- Esquema aditivo `crm` para cuentas, contactos, relaciones, puntos de contacto,
  permisos, supresiones, conversaciones, mensajes, eventos, colas, asignaciones,
  lecturas, actividades, presupuestos y uso.
- Staging de importación con filas originales, checksums, procedencia,
  normalización, revisión y candidatos de deduplicación.
- Modelo operativo de pipeline, oportunidades, tareas, scoring y atribución.
- RPCs administrativos de sólo lectura para directorio y resúmenes.
- Edge Function `crm-import-dry-run`, protegida por JWT, membresía admin, límite
  de lote y kill switch apagado por defecto.
- Edge Function pública `whatsapp-webhook`, cuya autenticidad depende de la
  firma Meta sobre el cuerpo original y del alcance WABA/teléfono permitido.
- Edge Function autenticada `whatsapp-send`, protegida por JWT, membresía admin,
  origen permitido, permisos, supresión, ventana de 24 horas, plantilla,
  presupuesto, idempotencia y kill switch apagado por defecto.
- Vistas administrativas CRM 2.0 de sólo lectura, ocultas por feature flags.

## Arquitectura WhatsApp vigente y transición

El repositorio conserva dos arquitecturas deliberadamente separadas:

1. **Legado/manual:** `WhatsAppCRM`, `WhatsAppQueueManager`,
   `whatsappService`, `whatsapp_queue`, `marketing_contacts`, RPCs históricos,
   enlaces `wa.me` y restos opcionales de N8N.
2. **Objetivo:** Meta WhatsApp Business Platform Cloud API → Supabase Edge
   Functions → esquema `crm`.

Puede reutilizarse del legado únicamente la presentación visual, textos y el
concepto de modo manual asistido. No deben reutilizarse como autoridad de envío:

- las colas históricas;
- los contadores calculados en navegador;
- `register_whatsapp_sent` o cualquier flujo que marque `sent` antes del evento
  del proveedor;
- escrituras directas desde React a colas, consentimientos o estados;
- el webhook N8N expuesto mediante una variable `VITE_`.

La Cloud API nueva todavía no está conectada a la UI heredada. Esa separación
evita que una pantalla existente active accidentalmente el proveedor nuevo.

## Gates que fallan cerrados

- `WHATSAPP_SEND_ENABLED` debe ser exactamente `true`; no está activado.
- `CRM2_IMPORT_DRY_RUN_ENABLED` debe ser exactamente `true`; no está activado.
- Los tres módulos Admin CRM 2.0 requieren flags `VITE_CRM2_*`; sus valores de
  ejemplo son `false`.
- No existe política de presupuesto activa ni datos seed de WhatsApp.
- Los 15,617 contactos conservan consentimiento email y WhatsApp `unknown`.
- Las 447 supresiones prevalecen sobre cualquier permiso futuro.
- Los mercados Global Discovery sólo pueden publicarse desde el registro
  público si el manifiesto está `active` y el inventario está reconciliado.

## Validación del paquete real

Validación local de sólo lectura repetida el 2026-08-14:

| Dataset | Filas | Resultado |
|---|---:|---|
| Cuentas | 4,418 | PASS |
| Contactos | 15,617 | PASS |
| Supresiones | 447 | PASS |
| Revisión manual | 17 | PASS |

No se imprimieron nombres, teléfonos, emails ni compañías. Hay 2 contactos sin
cuenta, 15 emails primarios inválidos y las coincidencias de supresión están
reconciliadas. Ninguna fila fue importada.

## Hallazgos de seguridad pendientes

1. Un archivo de ejemplo versionado contenía valores con formato compatible con
   credenciales privadas de Stripe. Fue sustituido localmente por placeholders.
   Antes de publicar esta rama se deben rotar preventivamente la clave privada y
   el secreto webhook en Stripe/Netlify y revisar el historial Git. No se debe
   copiar ningún valor al repositorio.
2. El endpoint público de diagnóstico revelaba presencia y prefijo de una clave
   Stripe. Fue reducido localmente a `{ "status": "ok" }`, sin entorno,
   versiones, dependencias ni CORS abierto.
3. La autorización inicial de las Edge Functions comprueba membresía en
   `admin_users`, pero la matriz definitiva de roles CRM aún debe reconciliarse
   con los roles reales de la base aislada antes de permitir importación o envío.
4. Las claves cliente de Maps y Supabase existentes no fueron modificadas. Antes
   de producción se deben comprobar sus restricciones de dominio, app y API en
   sus respectivas consolas; esta fase no altera Maps.
5. El CRM legado conserva escrituras y acciones de email/WhatsApp. Debe quedar
   separado de CRM 2.0 hasta completar una migración explícita y pruebas de
   regresión operativa.

## Bloqueos antes de producción

1. Completado: rama Supabase Preview aislada `gdgammcggwvxhkoobgdy`, sin datos
   y separada del proyecto productivo.
2. Completado: migraciones CRM `40000`, `41000`, `42000` y `43000` aplicadas
   exclusivamente en Preview; verificador de sólo lectura con 10/10 PASS.
2.1. Exponer declarativamente el esquema `crm` en PostgREST y comprobar una
   lectura vacía HTTP 200 en Preview antes de desplegar Edge Functions.
3. Probar RLS y grants como `anon`, `authenticated`, administrador y
   `service_role`; reconciliar la matriz de roles.
4. Ejecutar dry-run por lotes con el paquete real, sin promoción, y reconciliar
   exactamente los conteos aprobados.
5. Rotar preventivamente las credenciales Stripe potencialmente expuestas.
6. Configurar Meta en un entorno de prueba, registrar únicamente números
   allowlist, sincronizar plantillas y mantener presupuesto/kill switch cerrados.
7. Autorizar por separado cualquier importación, mensaje, migración productiva,
   commit, push y despliegue.

## Resultado de esta fase

- Código local: validado en una base PostgreSQL Preview aislada.
- Base de datos: 37/37 tablas con RLS forzado; permisos, RPC, kill switch y
  conteos vacíos verificados con 10/10 PASS.
- CRM import: dry-run preparado, no ejecutado contra Supabase.
- WhatsApp Cloud API: arquitectura preparada, envío desactivado.
- Global Discovery: mercados preview no indexables ni consultables públicamente.
- Auth/email: sin contraseñas temporales; relays de correo autenticados y
  endpoint legado retirado. Requiere secreto interno de servidor antes de deploy.
- Producción: sin cambios.
