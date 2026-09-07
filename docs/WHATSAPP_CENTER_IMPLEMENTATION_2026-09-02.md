# WhatsApp Center — avance 2026-09-02

## Implementado

- Ruta administrativa `/admin/whatsapp` y acceso desde el menú del CRM.
- Resumen de integración con modo TEST/PRODUCTION, health de base, último webhook,
  actividad reciente y presencia de configuración sin devolver secretos.
- Bandeja paginada, mensajes por conversación, estados reales, ficha resumida de
  contacto/cuenta, consentimiento y supresión.
- Vista de plantillas sincronizadas, diagnóstico operativo y guía para usuarios no técnicos.
- Métricas de cola outbound: pending, retry, processing, dead letter y próximo
  job vencido.
- Pestaña de readiness de campañas con conteos agregados de contactos activos,
  WhatsApp válidos, marketing elegible, servicio elegible, supresiones,
  consentimientos unknown y riesgo de cola.
- Edge Function autenticada `whatsapp-admin`, limitada a miembros de `admin_users`.
- La función desplegada mantiene `verify_jwt=true`; una petición anónima devuelve 401.
- Envíos reales permanecen cerrados mediante `WHATSAPP_SEND_ENABLED=false` salvo
  activación explícita posterior.

## Reutilizado

- Webhook sandbox certificado y su HMAC obligatoria.
- Esquema canónico `crm` para conversaciones, mensajes, estados, actividades,
  permisos, supresiones, plantillas, tareas, colas y auditoría.
- Edge Function `whatsapp-send` con autorización, idempotencia, ventana de servicio,
  plantilla aprobada, presupuesto y suppression checks. En la versión local
  actual sólo encola; no llama a Meta directamente.
- Edge Function `whatsapp-worker` preparada localmente para reclamar jobs de
  forma atómica y procesarlos cuando `WHATSAPP_SEND_ENABLED=true`.

## Pendiente antes de producción

1. Rotar nuevamente el Meta App Secret si el valor actual estuvo expuesto en chat.
2. Configurar y validar System User Access Token permanente exclusivamente en Supabase.
3. Confirmar suscripción real de la app al WABA y sincronizar plantillas aprobadas.
4. Registrar el número real como entidad separada; no mezclarlo con el número de prueba.
5. Probar `whatsapp-admin` con una sesión admin real desde la interfaz desplegada.
6. Desplegar `whatsapp-worker` y programar su ejecución controlada después de
   aplicar `20260907021000_whatsapp_outbound_job_claiming.sql`.
7. Activar compositor sólo después de validar token, plantilla, presupuesto y consentimiento.
8. Implementar gestión de follow-ups, asignaciones y oportunidades desde la UI.
9. Implementar creación de campañas con preview de audiencia y dry run obligatorio.
10. Añadir analítica y atribución comercial.

## Variables server-side

- `META_APP_SECRET`
- `META_GRAPH_API_VERSION`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_SEND_ENABLED`
- `WHATSAPP_ALLOWED_ORIGINS`
- `WHATSAPP_ALLOW_META_TEST_PAYLOADS`
- `WHATSAPP_META_TEST_PHONE_NUMBER_IDS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Ninguna de estas variables debe utilizar el prefijo `VITE_`.
