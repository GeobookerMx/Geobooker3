# Geobooker WhatsApp Center - cierre tecnico

Fecha de auditoria local: 2026-09-21

## Dictamen

El canal individual y el CRM de WhatsApp estan tecnicamente preparados para
recepcion, respuesta de servicio controlada, consentimiento, templates,
persistencia de estados y bloqueo de destinatarios no elegibles.

El modulo de campanas ya tiene implementado localmente el tramo estructural:

`draft -> materializacion/revision -> approval no-send -> dispatch preflight -> reserva atomica -> outbound job`

El preflight sigue siendo no-send. La nueva operacion posterior puede crear
`crm.outbound_jobs` de forma atomica e idempotente, pero nace detras de un gate
de base de datos cerrado, temporal y single-use. No cambia
`WHATSAPP_SEND_ENABLED` ni llama a Meta. Como la migracion y el worker compatible
aun no se aplican/certifican en el entorno remoto, el estado correcto sigue
siendo `PRODUCTION CONFIGURED - SEND DISABLED`.

## Evidencia local revisada

| Control | Estado tecnico | Evidencia |
|---|---|---|
| Webhook GET y POST firmado | PASS | Challenge exacto, HMAC SHA-256, scope WABA/Phone y test sample limitado. |
| Mensajes entrantes | PASS | Idempotencia por provider message ID, conversacion y actividad vinculadas. |
| Estados Meta | PASS | `sent`, `delivered`, `read`, `failed` y `deleted`; fingerprint idempotente y sin regresion de estado. |
| Ventana de servicio | PASS | Texto libre solo dentro de la ventana iniciada por el cliente. |
| Templates | PASS CON GATE | Deben estar aprobadas por Meta, reconciliadas y habilitadas expresamente en CRM. |
| Consentimiento | PASS | Doble opt-in desde formulario y confirmacion desde el mismo numero; evidencia y version de texto. |
| BAJA / STOP | PASS EN CODIGO | Actualiza permisos de servicio/transaccional/marketing y agrega suppression activa. Falta evidencia E2E de una BAJA real sobre un contacto de prueba descartable. |
| Suppression al enviar | PASS | Se revalida tanto al crear la salida como en el worker. |
| Presupuesto | PASS EN CODIGO | Rate card activa, limite diario/mensual y kill switch fail-closed. |
| Frequency cap | PASS EN CODIGO | Piloto MX: 1 marketing/24 h, 1/7 dias, maximo 4/30 dias e intervalo minimo de 7 dias. |
| Limite global del piloto | PASS EN CODIGO | 20 mensajes/dia y MXN 1,000/mes. |
| Cola y reintentos | PASS | Claim con `SKIP LOCKED`, reintentos limitados, ambiguous timeout y dead letter. |
| Campaign Wizard V2 | PASS NO-SEND | Audiencia acotada, pais/idioma/template/consentimiento/evidencia/suppression y tarifa. |
| Despacho real de campana | IMPLEMENTADO LOCAL / NO APLICADO | La migracion `20260921100000` agrega conversion atomica e idempotente de `campaign_members` a `outbound_jobs`, cerrada por defecto. Falta aplicar y certificar. |
| Reservacion atomica de cuota/costo | IMPLEMENTADO LOCAL / NO APLICADO | La misma migracion reserva costo/cuota bajo lock transaccional, conserva estados y libera solo fallos definitivos pre-provider. Falta aplicar y certificar. |
| Kill switch global | PASS | Debe permanecer `WHATSAPP_SEND_ENABLED=false` hasta completar los P0. |

Ultima fotografia operativa de solo lectura reportada durante el cierre:

- un contacto MX elegible con opt-in y evidencia;
- cero suppressions para ese contacto;
- dos templates CRM habilitadas y reconciliadas;
- cero trabajos `pending`, `retry` o `dead_letter`;
- envio global desactivado.

Esta fotografia no sustituye una consulta nueva justo antes de cada piloto.

## P0 necesarios antes de una campana real

Los P0 1 y 2 ya tienen implementacion local, validacion read-only y runbook en
`WHATSAPP_ATOMIC_DISPATCH_RUNBOOK_2026-09-21.md`. Siguen siendo bloqueos de
produccion hasta aplicar la migracion, desplegar el worker compatible y pasar
la validacion con todos los gates cerrados.

### 1. Despacho transaccional e idempotente

Implementar una funcion backend/service-role que reciba una campana aprobada y
un `preflight_run_id` vigente. En una transaccion debe:

1. bloquear la campana y los miembros seleccionados;
2. volver a comprobar template, mercado, idioma, consentimiento y evidencia;
3. volver a comprobar suppression y estado del contact point;
4. reservar limite diario, frecuencia y presupuesto antes de crear trabajos;
5. crear como maximo un `outbound_job` por miembro mediante clave idempotente;
6. vincular `campaign_members.queued_job_id`;
7. registrar un `campaign_event` y un `audit_log` sin PII innecesaria;
8. abortar todo el lote ante una inconsistencia, sin entrega parcial silenciosa.

La funcion no debe recibir SQL, endpoints, tokens ni Phone Number IDs desde el
navegador. Tampoco debe activar el secret global.

### 2. Evitar carreras de presupuesto y frecuencia

La consulta actual de guards es necesaria pero no suficiente ante workers
concurrentes. La reserva debe vivir en PostgreSQL con bloqueo transaccional o
contador atomico. La liberacion de reservas solo debe ocurrir en estados
definidos (`failed` definitivo/cancelado), conservando auditoria.

### 3. Piloto allowlisted de una sola persona

Desde una sesion real de `super_admin`:

1. crear campana MX/es_MX con `max_recipients=1`;
2. seleccionar un template marketing aprobado, reconciliado y habilitado;
3. materializar audiencia y confirmar exactamente un elegible;
4. aprobar en modo no-send;
5. ejecutar preflight y exigir `can_schedule=true`;
6. verificar nuevamente que no hay suppressions ni jobs ambiguos;
7. abrir el kill switch solo durante la ventana autorizada;
8. despachar un solo miembro y ejecutar un worker con limite 1;
9. cerrar inmediatamente `WHATSAPP_SEND_ENABLED=false`.

No utilizar CSV, scraping, directorios publicos ni numeros abiertos como
consentimiento. Esas fuentes solo pueden alimentar investigacion y solicitud
de opt-in por un canal permitido.

### 4. Estados y reconciliacion

Para el mensaje del piloto deben quedar vinculados:

- provider message ID;
- `accepted/sent/delivered/read` o un `failed` explicable;
- un solo `message_status_event` por fingerprint;
- `crm.messages`, `crm.conversations`, `crm.activities` y `crm.usage_ledger`;
- costo estimado, rate card y version utilizada;
- cero duplicados de jobs, mensajes o actividades.

### 5. BAJA real y rollback

Usar un contacto de prueba que pueda volver a completar el opt-in. Enviar
`BAJA`, comprobar permisos `opted_out`, suppression activa e idempotencia, y
confirmar que un nuevo intento se bloquea antes de Meta. Despues:

- mantener `WHATSAPP_SEND_ENABLED=false`;
- revisar que no existan `pending`, `processing`, `retry`, `unknown` o
  `dead_letter` sin resolver;
- dejar presupuesto/frequency kill-switched si el piloto no continuara;
- no borrar mensajes, consentimiento ni auditoria.

## Gates para expansion internacional

Cada pais debe abrirse de forma independiente. Requiere politica de mercado
revisada, idioma y template exactos, rate card vigente en la misma moneda del
presupuesto, zona horaria, consentimiento demostrable y limites propios. La
aprobacion en Mexico no autoriza Estados Unidos, Canada, Reino Unido u otros
mercados.

## Pruebas locales de esta auditoria

- `node scripts/tests/whatsapp-security.test.mjs`: PASS.
- `node scripts/tests/whatsapp-webhook.test.mjs`: PASS.
- La ejecucion conjunta con `node --test` no pudo crear procesos hijos en el
  sandbox Windows (`spawn EPERM`); ambos archivos pasaron al ejecutarse de
  forma directa y secuencial.

## Criterio de cierre

WhatsApp individual/controlado puede considerarse operativo. WhatsApp
Campaigns solo podra marcarse `GO` cuando los cinco P0 anteriores tengan
evidencia E2E y el kill switch haya regresado a `false`. Hasta entonces no se
debe anunciar el canal como automatizacion comercial abierta ni usarlo para
listas frias.
