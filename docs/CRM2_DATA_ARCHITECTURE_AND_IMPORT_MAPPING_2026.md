# Geobooker CRM 2.0 — arquitectura de datos e importación 2026

Estado: diseño y auditoría local. No es una migración ni autoriza importaciones o envíos.

## Resumen ejecutivo

El paquete normalizado puede alimentar CRM 2.0, pero no debe insertarse en `marketing_contacts` ni en `crm_contacts`. Contiene 4,418 cuentas, 15,617 contactos, 447 direcciones suprimidas y 17 contactos que requieren revisión. Los permisos de email y WhatsApp son desconocidos y deben conservarse así.

La arquitectura objetivo debe ser account-centric, conservar cada fila original, promover registros por lotes idempotentes y separar identidad, relación laboral, permisos, supresiones, scoring y actividad comercial. Los identificadores `account_id` y `contact_id` del paquete son identificadores externos estables, no las llaves UUID internas del CRM.

## Estado actual y decisión de compatibilidad

En el repositorio coexisten al menos estos conceptos:

- `crm_contacts`: lista plana orientada a email.
- `marketing_contacts`: lista plana utilizada por el Admin, colas y automatizaciones.
- `whatsapp_queue`: cola histórica/manual.
- `unified_whatsapp_outreach`: registro manual que hoy marca `sent` antes de confirmar entrega.
- `crm_consent`: intento de consentimiento por canal ligado a `marketing_contacts`.
- varias versiones de RPC para generar colas y registrar envíos.

No se deben renombrar o eliminar en la primera migración. CRM 2.0 debe convertirse en la autoridad nueva y una capa de compatibilidad explícita debe alimentar sólo los consumidores antiguos aprobados durante la transición.

Riesgos actuales relevantes:

- El Admin descarga hasta 25,000 contactos y filtra en el navegador.
- Hay funciones de cola duplicadas con criterios distintos.
- El flujo `wa.me` registra un envío antes de que el operador lo complete.
- Una definición histórica de RLS de `crm_consent` concede escritura a `authenticated` y `anon`; no es apta para CRM 2.0.
- Las supresiones por rebote y opt-out no son una barrera única imposible de omitir.
- `crm_contacts`, `marketing_contacts` y los historiales no comparten una identidad canónica.

## Modelo objetivo

```text
crm_sources ──< crm_import_batches ──< crm_import_rows
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
          crm_accounts_staging                    crm_contacts_staging
                     │                                       │
                     ▼                                       ▼
              crm_accounts ──< crm_account_contacts >── crm_contacts
                     │                                       │
                     ├──< crm_opportunities                   ├──< crm_contact_points
                     ├──< crm_activities                      ├──< crm_channel_permissions
                     ├──< crm_tasks                           ├──< crm_scores
                     └──< crm_campaign_members >──────────────┘

crm_suppressions ── blocks ──> crm_contact_points / campaign members
crm_provider_messages ──< crm_provider_events ──> crm_usage_ledger
```

Tablas de staging nunca se consultan para campañas. La promoción se realiza desde servidor mediante un lote validado y aprobado.

## Flujo de importación

1. Crear `crm_import_batches` con checksum, nombre del archivo, conteos esperados y estado `uploaded`.
2. Guardar cada fila sin alterar en `crm_import_rows.raw_payload`, junto con número de fila y checksum.
3. Parsear hacia las tres tablas de staging: cuentas, contactos y supresiones.
4. Recalcular normalizaciones; nunca confiar únicamente en campos derivados del CSV.
5. Validar referencias de contacto a cuenta, emails, dominios, teléfonos, estados y conteos.
6. Buscar coincidencias deterministas. Coincidencias ambiguas quedan `needs_review` y nunca se fusionan automáticamente.
7. Aplicar primero la lista de supresión.
8. Generar un resumen y exigir aprobación administrativa explícita.
9. Promover por upsert idempotente usando `(source_id, original_source_id)`.
10. Conservar enlace a `import_row_id`; rollback lógico desactiva o revierte sólo registros creados por ese lote, sin borrar actividad posterior.

## Reglas de deduplicación

Cuenta:

1. dominio corporativo canónico exacto;
2. nombre normalizado + país exactos;
3. nombre + ciudad/dirección/teléfono como candidato manual;
4. fuzzy match sólo sugiere, nunca fusiona.

Contacto:

1. email personal/corporativo normalizado exacto;
2. teléfono E.164 exacto;
3. misma cuenta + nombre normalizado exacto;
4. email corporativo compartido no identifica por sí solo a una persona;
5. coincidencias probables quedan en revisión.

Toda fusión futura debe conservar `master_record_id`, registros de origen, motivo, actor, fecha y valores previos.

## Mapeo de `crm2_accounts.csv`

Todas las filas se conservan además en `crm_import_rows.raw_payload`.

| SOURCE CSV FIELD | PROPOSED CRM 2.0 TABLE | PROPOSED COLUMN | TRANSFORMATION REQUIRED | VALIDATION REQUIRED | IMPORT STATUS |
|---|---|---|---|---|---|
| account_id | crm_accounts_staging | external_account_id | trim | único dentro de fuente | staging/upsert key |
| company_name | crm_accounts | display_name | trim y Unicode NFC | requerido salvo revisión | candidate |
| company_name_key | crm_accounts | normalized_name | recalcular, conservar valor fuente en raw | comparar con recalculado | derived |
| tier | crm_accounts | source_tier | uppercase | AAA/AA/A/B o review | candidate |
| sector | crm_accounts | industry | taxonomía controlada posterior | valor conocido/no vacío | candidate |
| employee_count_estimate | crm_accounts | employee_count_estimate | entero | >= 0, plausibilidad | candidate |
| neighborhood | crm_accounts | neighborhood | trim | longitud/formato | candidate |
| postal_code | crm_accounts | postal_code | texto, no número | formato según país | candidate |
| city_raw | crm_accounts | city_raw | trim; geocodificación separada | no inferir país sin evidencia | candidate |
| area_code | crm_accounts | source_area_code | sólo dígitos | compatible con teléfono/país | candidate |
| phone_1_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_1_digits | crm_contact_points | normalized_value | recalcular E.164 si hay país | teléfono válido/no ambiguo | review if ambiguous |
| phone_2_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_2_digits | crm_contact_points | normalized_value | recalcular E.164 | teléfono válido/no duplicado | review if ambiguous |
| phone_3_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_3_digits | crm_contact_points | normalized_value | recalcular E.164 | teléfono válido/no duplicado | review if ambiguous |
| corporate_email | crm_contact_points | normalized_value | lowercase/trim/IDN | sintaxis, dominio y supresión | blocked if suppressed |
| corporate_email_valid | crm_contact_points | source_valid | boolean | comparar con validador | derived |
| corporate_email_bounced | crm_contact_points | source_bounced | boolean | cruzar supresiones | blocked if true |
| website | crm_accounts | website_url | URL canónica HTTPS cuando proceda | URL válida | candidate |
| website_domain | crm_accounts | normalized_domain | lowercase, punycode, sin `www` | dominio válido y consistente | dedupe key candidate |
| contact_count | crm_accounts_staging | source_contact_count | entero | reconciliar con contactos | audit only |
| data_quality_score | crm_scores | source_data_quality_score | entero | 0–100; no recalcular en sitio | source score |
| source | crm_sources | source_key | mapear catálogo | fuente aprobada | required |
| source_first_row | crm_accounts_staging | source_first_row | entero | rango del archivo | provenance |

## Mapeo de `crm2_contacts.csv` y `crm2_contacts_needs_review.csv`

Ambos archivos usan el mismo esquema. `needs_review` jamás se promueve automáticamente.

| SOURCE CSV FIELD | PROPOSED CRM 2.0 TABLE | PROPOSED COLUMN | TRANSFORMATION REQUIRED | VALIDATION REQUIRED | IMPORT STATUS |
|---|---|---|---|---|---|
| contact_id | crm_contacts_staging | external_contact_id | trim | único dentro de fuente | staging/upsert key |
| account_id | crm_contacts_staging | external_account_id | trim | debe existir en staging/canonical | relation candidate |
| source_sheet | crm_import_rows | source_partition | trim | hoja conocida | provenance |
| source_row | crm_import_rows | source_row_number | entero | > 0 y único por lote/hoja | provenance |
| company_name_raw | crm_contacts_staging | company_name_raw | ninguna | comparar con cuenta vinculada | review on mismatch |
| job_title | crm_contacts | job_title | trim/Unicode NFC | longitud y caracteres | candidate |
| contact_name | crm_contacts | full_name | trim; no dividir destructivamente | no usar como llave única | candidate/review |
| contact_level | crm_contacts | seniority_source | catálogo controlado | valor permitido | candidate |
| primary_email_raw | crm_contact_points | raw_value | ninguna | presencia | provenance |
| primary_email | crm_contact_points | normalized_value | lowercase/trim/IDN | sintaxis, dominio, supresión | blocked if invalid/suppressed |
| primary_email_valid | crm_contact_points | source_valid | boolean | recalcular y comparar | derived |
| primary_email_bounced | crm_contact_points | source_bounced | boolean | cruzar supresiones | blocked if true |
| primary_email_domain | crm_contact_points | normalized_domain | lowercase/IDN | coincide con email | derived |
| corporate_email | crm_contact_points | normalized_value | lowercase/trim/IDN | compartido: no dedupe de persona | blocked if suppressed |
| corporate_email_valid | crm_contact_points | source_valid | boolean | recalcular | derived |
| corporate_email_bounced | crm_contact_points | source_bounced | boolean | cruzar supresiones | blocked if true |
| company_type | crm_accounts | source_company_type | trim/catálogo | coherencia entre contactos de cuenta | candidate |
| tier | crm_accounts | source_tier | uppercase | reconciliar con cuenta | candidate/review |
| employee_count_raw | crm_import_rows | raw_payload | ninguna | ninguna fuera de trazabilidad | raw only |
| employee_count_estimate | crm_accounts | employee_count_estimate | entero | reconciliar con cuenta | candidate/review |
| neighborhood | crm_accounts | neighborhood | trim | reconciliar con cuenta | candidate |
| postal_code | crm_accounts | postal_code | texto | formato según país | candidate |
| city_raw | crm_accounts | city_raw | trim | no inferir país sin evidencia | candidate |
| area_code | crm_contacts_staging | source_area_code | sólo dígitos | compatibilidad geográfica | candidate |
| phone_1_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_1_digits | crm_contact_points | normalized_value | E.164 sólo con país confiable | válido/no duplicado | review if ambiguous |
| phone_2_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_2_digits | crm_contact_points | normalized_value | E.164 sólo con país confiable | válido/no duplicado | review if ambiguous |
| phone_3_raw | crm_contact_points | raw_value | ninguna | presencia | candidate |
| phone_3_digits | crm_contact_points | normalized_value | E.164 sólo con país confiable | válido/no duplicado | review if ambiguous |
| website | crm_accounts | website_url | URL canónica | URL válida | candidate |
| website_domain | crm_accounts | normalized_domain | lowercase/punycode/sin `www` | dominio válido | dedupe candidate |
| lead_priority_score | crm_scores | source_lead_priority_score | entero | 0–100; no tratar como probabilidad | source score |
| email_marketing_opt_in | crm_channel_permissions | status | mapear vacío/unknown a `unknown` | nunca inferir `allowed` | blocked for automation |
| whatsapp_opt_in | crm_channel_permissions | status | mapear vacío/unknown a `unknown` | nunca inferir `allowed` | blocked for automation |
| suppression_status | crm_suppressions / crm_contact_points | effective_status | catálogo canónico | barrera global por identificador | blocked when applicable |
| crm_import_status | crm_contacts_staging | validation_status | mapear catálogo | sólo `ready` puede solicitar promoción | review/ready |
| review_reasons | crm_contacts_staging | review_reasons | lista estructurada | códigos reconocidos | manual review |
| source | crm_sources | source_key | mapear catálogo | fuente aprobada | required |

`crm_account_contacts` se crea al promover una relación válida `account_id` → `contact_id`, con `relationship_type = employee`, fechas de vigencia y `is_primary` independiente.

## Mapeo de `crm2_bounce_suppression.csv`

| SOURCE CSV FIELD | PROPOSED CRM 2.0 TABLE | PROPOSED COLUMN | TRANSFORMATION REQUIRED | VALIDATION REQUIRED | IMPORT STATUS |
|---|---|---|---|---|---|
| bounce_id | crm_suppressions_staging | external_suppression_id | trim | único por fuente | staging/upsert key |
| source_sheet | crm_import_rows | source_partition | trim | hoja conocida | provenance |
| source_row | crm_import_rows | source_row_number | entero | > 0 y único por lote/hoja | provenance |
| event_at | crm_suppressions | occurred_at | timestamp con zona conocida o marcada | fecha válida/no futura extrema | candidate/review |
| status | crm_suppressions | reason | catálogo (`bounce`, `hard_bounce`, etc.) | severidad reconocida | candidate |
| email | crm_suppressions | normalized_identifier | lowercase/trim/IDN | email válido; hash auxiliar para búsqueda | active suppression |
| subject | crm_import_rows | raw_payload | ninguna | no usar para identidad | raw only |
| sender_email | crm_suppressions | source_sender | lowercase/trim | email válido; no es el suprimido | provenance |

La promoción de supresiones ocurre antes que cuentas/contactos. Una supresión activa prevalece sobre flags permisivos de campañas y no se borra al reimportar contactos.

## Consentimiento y contacto permitido

No se utilizará un booleano genérico. `crm_channel_permissions` tendrá como mínimo:

- `contact_id`, `channel`, `purpose` (`marketing`/`transactional`);
- `status`: `unknown`, `allowed`, `opted_in`, `opted_out`, `suppressed`, `bounced`, `invalid`, `complaint`;
- fuente, jurisdicción, texto/versión de consentimiento y timestamps;
- historial inmutable de cambios.

Regla de salida: una campaña sólo crea un miembro elegible si el permiso efectivo del canal/propósito lo permite y no existe supresión global. Los 15,617 contactos de este paquete inician como `unknown`; no son elegibles para automatización.

## WhatsApp Cloud API y cobro por uso

Decisión recomendada: conservar el flujo manual `wa.me` como modo asistido y agregar Meta WhatsApp Cloud API como proveedor separado, desactivado por defecto. La API oficial factura por mensaje entregado, con tarifa dependiente de país y categoría; la aplicación no debe codificar precios fijos.

Objetos requeridos antes de enviar:

- `crm_message_templates`: nombre Meta, idioma, categoría, versión y estado de aprobación.
- `crm_provider_messages`: idempotency key, contacto, campaña, template, estado solicitado/aceptado/entregado/leído/fallido.
- `crm_provider_events`: payload mínimo normalizado, checksum y evento webhook único.
- `crm_usage_ledger`: país, categoría, cantidad entregada, tarifa/version de rate card, moneda y costo estimado/confirmado.
- `crm_budget_policies`: topes diario/mensual por campaña, mercado y proveedor; kill switch global.

Flujo seguro:

1. Admin crea campaña en borrador y obtiene estimación máxima.
2. Servidor calcula elegibilidad; el navegador nunca decide consentimiento ni costo.
3. Aprobación humana explícita bloquea audiencia, template y presupuesto.
4. Worker envía con idempotencia y velocidad controlada.
5. Webhook HTTPS validado actualiza `sent`, `delivered`, `read`, `failed` e inbound/opt-out.
6. Sólo `delivered` alimenta el costo estimado; conciliación posterior puede ajustar el ledger.
7. Si falta tarifa, permiso, template aprobado o presupuesto, el envío falla cerrado.

No se reutilizará `register_whatsapp_sent` para la API porque actualmente marca `sent` antes de una confirmación del proveedor. El modo manual debe registrar `opened_for_manual_send` y exigir confirmación del operador, sin presentarlo como entrega.

## Admin 2.0

Navegación objetivo: Dashboard, Cuentas, Contactos, Oportunidades, Pipeline, Tareas, Campañas, Segmentos, Importaciones, Reportes y Configuración.

Primer corte seguro:

- paginación, búsqueda, orden y filtros en servidor;
- página de Importaciones con conteos, errores, duplicados y aprobación, sin autoimport;
- ficha de cuenta con contactos y procedencia;
- centro de consentimiento/supresión visible;
- campañas en borrador sin botón de envío hasta completar el proveedor y las políticas;
- indicador separado de “WhatsApp manual abierto”, “aceptado por proveedor” y “entregado”.

## RLS mínima

| Rol | Accounts/Contacts | Imports | Consent/Suppression | Campaigns | Provider messages/costs |
|---|---|---|---|---|---|
| super_admin | CRUD | approve/rollback | CRUD | CRUD/approve | full |
| crm_admin | CRUD | create/review | CRUD | CRUD | read |
| sales_manager | team scope | read | read/request change | team CRUD | aggregate read |
| sales_agent | owned scope | none | read/request opt-out | owned drafts | own status only |
| marketing | segment read | none | read | drafts/operate approved | aggregate read |
| analyst | masked read | aggregate | aggregate | read | aggregate |
| read_only | masked read | none | masked | read | aggregate |

Todas las escrituras privilegiadas, importaciones, promociones y envíos se ejecutan server-side. No se concede escritura CRM a `anon`; `authenticated` tampoco obtiene acceso global por defecto.

## Secuencia recomendada de implementación

1. Aprobar este modelo, nombres, retención y matriz RLS.
2. Inventariar el esquema real de producción con consultas read-only; los SQL del repositorio no prueban qué fue aplicado.
3. PR CRM foundation: migraciones aditivas, RLS y pruebas; sin importar datos.
4. PR import engine: raw/staging/validación/dedupe con fixtures sintéticos y dry-run.
5. PR Admin accounts/contacts/import review con paginación server-side.
6. Ensayo del paquete real en entorno aislado; reconciliar exactamente 4,418/15,617/447/17.
7. Aprobación explícita para producción y plan de rollback antes de importar.
8. Oportunidades, pipeline, tareas, timeline, scoring y atribución Global Discovery.
9. Campañas/provider abstraction; email y WhatsApp siguen desactivados.
10. Configurar Meta Cloud API, webhooks, plantillas, presupuestos y prueba con allowlist interna.
11. Autorización separada antes de cualquier campaña real.

## Criterios de aceptación del dry-run

- checksum del ZIP/archivos y conteos reconciliados;
- cero filas perdidas;
- 17 contactos en revisión y fuera de campañas;
- 447 identificadores únicos en supresión;
- todos los permisos importados en `unknown` salvo evidencia explícita posterior;
- ninguna fusión fuzzy automática;
- repetición del mismo lote no crea duplicados;
- rollback lógico demostrado;
- ninguna PII enviada a GA4/logs del cliente;
- ninguna llamada a Resend, WhatsApp o n8n durante pruebas de importación.

## No cambiar todavía

- archivos fuente del ZIP;
- producción Supabase o sus datos;
- Auth, Stripe, Firebase, Maps, deep links o builds móviles;
- colas y automatizaciones actuales;
- credenciales o configuración de Meta/Resend;
- eliminación de tablas o RPC legadas;
- envío de email o WhatsApp.
