# WhatsApp Campaigns - atomic dispatch runbook

Fecha: 2026-09-21

## Alcance

La migracion `20260921100000_crm_whatsapp_atomic_campaign_dispatch.sql`
completa la estructura local que faltaba entre un preflight aprobado y la cola
`crm.outbound_jobs`. No llama Meta, no despliega funciones y no modifica
`WHATSAPP_SEND_ENABLED`.

Hay dos kill switches independientes:

1. `crm.whatsapp_campaign_dispatch_controls.queue_enabled`: permite reservar y
   crear jobs, pero nace en `false`, expira y es single-use por defecto.
2. `WHATSAPP_SEND_ENABLED`: permite que el worker llegue a Meta. Permanece
   `false` y no puede ser modificado desde PostgreSQL.

Abrir solamente el primer gate nunca envia un mensaje.

## Flujo implementado

1. Una campana WhatsApp debe estar `approved`.
2. El preflight debe ser `ready`, no-send y tener menos de 15 minutos.
3. El gate de cola debe tener autorizador, expiracion futura y limite entre 1 y
   20; para el piloto se recomienda exactamente 1 y single-use.
4. La funcion toma un advisory transaction lock y bloquea campana, preflight,
   politicas y miembros.
5. Revalida WABA/telefono activo, template, idioma, mercado, rate card,
   presupuesto, frecuencia, contact point, consentimiento, evidencia y
   suppression.
6. Reserva cuota/costo en `crm.usage_ledger` y crea de forma atomica mensaje,
   job, vinculo del miembro y eventos de auditoria.
7. Si cualquier miembro falla, toda la transaccion se revierte.
8. El gate single-use vuelve a cerrarse despues de reservar el lote.
9. El worker vuelve a validar permiso/suppression, template, politicas y la
   reserva antes de cualquier llamada a Meta.

## Estados de reserva

- `reserved`: capacidad apartada; aun no existe confirmacion del proveedor.
- `committed`: Meta devolvio un provider message ID. No puede liberarse.
- `released`: fallo definitivo anterior a la aceptacion o expiracion segura;
  el costo estimado activo queda en cero, pero se conserva `reserved_amount`
  para auditoria.

`unknown` y respuestas ambiguas nunca liberan la reserva. En particular:

- timeout de red;
- HTTP 5xx en un job de campana;
- HTTP 2xx sin provider message ID.

Estos casos requieren reconciliacion humana/provider antes de reintentar para
evitar duplicados.

## Orden de aplicacion futuro

1. Crear backup y confirmar que el schema `crm` esta sano.
2. Confirmar que ya se aplicaron, en este orden logico, las bases de CRM,
   campaign readiness, template reconciliation, dispatch preflight,
   international consent, commercial safety gates, pilot budget gate y
   Campaign Wizard V2. La migracion nueva valida tablas/columnas prerrequisito
   y aborta completa si falta alguna.
3. Aplicar la migracion con el gate global de envio cerrado. El archivo usa
   `BEGIN/COMMIT`; `ALTER`, backfill, reemplazo del indice, controles y
   funciones se revierten juntos ante cualquier error.
4. Desplegar despues el worker compatible con reservas.
5. Ejecutar
   `supabase/validation/crm_whatsapp_atomic_campaign_dispatch_readonly.sql`.
6. Exigir:
   - tabla y cuatro funciones presentes;
   - `queue_enabled=false`;
   - execute para `service_role=true`;
   - execute para `anon=false` y `authenticated=false`;
   - cero relaciones colgantes o reservas invalidas.
7. No abrir ningun gate durante la validacion estructural.

## Piloto posterior

El primer piloto debe usar una sola campana, un preflight reciente, un solo
contacto propio con opt-in evidenciado y un template sin variables o con
`campaign_members.template_parameters` revisados. La cantidad de parametros
debe coincidir exactamente con `whatsapp_templates.variable_count`.

La autorizacion del gate de cola debe hacerse exclusivamente desde backend
administrativo, con `max_members_per_dispatch=1`, `single_use=true`, usuario
autorizador, referencia de cambio y expiracion breve. Nunca se debe exponer
esta actualizacion directamente al navegador.

Solo despues de verificar el job reservado se puede autorizar temporalmente el
worker. Al finalizar, `WHATSAPP_SEND_ENABLED` debe regresar a `false` y el gate
de cola debe comprobarse cerrado.

## Liberacion segura

`crm.release_whatsapp_campaign_reservation` es idempotente y acepta unicamente
`failed`, `cancelled` o `dead_letter`. Rechaza reservas `committed`, mensajes
con provider ID y estados `unknown`/ambiguos.

`crm.release_expired_whatsapp_campaign_reservations` procesa como maximo 100
reservas por llamada y solo jobs `pending/retry`, sin provider ID. Cancela el
job, marca el mensaje fallido, devuelve el miembro a `needs_review` y registra
eventos/auditoria. No debe automatizarse hasta validar primero el piloto.

## Rollback operacional

El rollback normal es no destructivo:

```sql
begin;

update crm.whatsapp_campaign_dispatch_controls
set queue_enabled = false,
    authorization_expires_at = null,
    authorized_by_user_id = null,
    authorization_reference = null,
    updated_at = now()
where provider = 'meta_cloud';

update crm.messaging_frequency_policies
set kill_switch = true, updated_at = now()
where channel = 'whatsapp' and purpose in ('marketing', 'transactional');

update crm.budget_policies
set kill_switch = true, updated_at = now()
where provider = 'meta_cloud';

commit;
```

Ademas, mantener `WHATSAPP_SEND_ENABLED=false`. No borrar mensajes, jobs,
usage ledger, consentimientos ni audit log. Las reservas `unknown` tampoco se
liberan en rollback hasta reconciliar si Meta proceso el mensaje.

## No cubierto por esta migracion

- activacion productiva;
- UI para autorizar el gate;
- scheduler del worker;
- reconciliacion automatica de estados `unknown`;
- campañas internacionales;
- envio de prueba o comercial.
