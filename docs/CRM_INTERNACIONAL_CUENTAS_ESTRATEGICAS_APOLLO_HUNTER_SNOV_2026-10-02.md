# CRM Internacional de Cuentas Estrategicas

Fecha: 2026-10-02

## Decision

El CRM empresarial debe vivir dentro del Admin de Geobooker, pero separado del CRM comercial. El modulo correcto es `International Strategic Accounts CRM`, apoyado en el schema `crm` con tablas `intl_*`.

La regla principal es simple:

`Apollo/Hunter/Snov -> International Outreach -> evidencia y aprobacion humana -> QUALIFIED -> CRM Bridge -> CRM comercial`

No se deben insertar prospectos frios directamente en `crm.contacts`, `marketing_contacts` ni WhatsApp Center.

## Estado Actual

Ya existe una base fuerte en `20260930140000_crm_international_outreach_phase1.sql`:

- `crm.intl_accounts`
- `crm.intl_contacts`
- `crm.intl_provider_connections`
- `crm.intl_provider_usage`
- `crm.intl_enrichment_attempts`
- `crm.intl_campaigns`
- `crm.intl_templates`
- `crm.intl_outreach_briefs`
- `crm.intl_compliance_reviews`
- `crm.intl_campaign_contacts`
- `crm.intl_messages`
- `crm.intl_mailboxes`
- readiness admin con `public.crm_intl_outreach_readiness()`

La fase nueva `20261002133000_crm_intl_strategic_accounts_phase2.sql` agrega:

- Account plans: `crm.intl_account_research`
- Evidence formal: `crm.intl_evidence`
- Claims aprobados: `crm.intl_claims_catalog`
- Buying committee: `crm.intl_buying_committee`
- CRM Bridge links: `crm.intl_crm_links`
- Outbox idempotente: `crm.intl_integration_outbox`
- Funcion de calificacion: `public.crm_intl_mark_qualified()`
- Readiness estrategico: `public.crm_intl_strategic_readiness()`

## Apollo

Uso recomendado:

1. Buscar personas por dominio, cargo y seniority.
2. No pedir telefonos.
3. No pedir emails personales.
4. Enriquecer solo cuando la cuenta ya este AAA o AA y no exista dato local.

Fuente oficial revisada:

- `POST https://api.apollo.io/api/v1/mixed_people/api_search`
- La busqueda de personas indica `0 credits`.
- La busqueda no devuelve emails ni telefonos; para eso se requiere enrichment.
- Documentacion: https://docs.apollo.io/reference/people-api-search

Variables necesarias:

- `APOLLO_API_KEY`
- `APOLLO_REVEAL_PERSONAL_EMAILS=false`
- `APOLLO_REVEAL_PHONE_NUMBER=false`
- `APOLLO_RUN_WATERFALL_EMAIL=false`

## Hunter

Uso recomendado:

1. Email Finder con nombre, apellido y dominio.
2. Email Verifier cuando el email no tenga evidencia suficiente.
3. Domain Search solo para revision manual, no para enviar listas masivas.

Fuente oficial revisada:

- Hunter API V2 incluye Domain Search, Email Finder, Email Verifier y recursos de Leads.
- La API key se obtiene desde dashboard y nunca debe llegar al navegador.
- Documentacion: https://hunter.io/api-documentation

Variable necesaria:

- `HUNTER_API_KEY`

## Snov.io

Uso recomendado:

1. Mantener en `manual` o `disabled` hasta confirmar acceso API real.
2. Usar como fallback, no como primer proveedor.
3. Registrar resultados manuales sin guardar credenciales de usuario.

Fuente oficial revisada:

- Snov.io documenta API para Email Finder, verificacion, sender y prospectos.
- Requiere credenciales/API access de la cuenta.
- Documentacion: https://snov.io/knowledgebase/how-to-use-snov-io-api/

Variables futuras:

- `SNOV_CLIENT_ID`
- `SNOV_CLIENT_SECRET`
- `SNOV_API_MODE=disabled|manual|trial|api`

## Pasos de Implementacion

1. Aplicar SQL fase 1 si no existe: `20260930140000_crm_international_outreach_phase1.sql`.
2. Aplicar SQL fase 2: `20261002133000_crm_intl_strategic_accounts_phase2.sql`.
3. Ejecutar:

```sql
SELECT public.crm_intl_outreach_readiness();
SELECT public.crm_intl_strategic_readiness();
SELECT * FROM public.crm_intl_provider_status();
```

4. Crear o confirmar cuentas gratuitas/corporativas de Apollo, Hunter y Snov.
5. Guardar keys solo como secrets de backend, no en React ni en Supabase publico.
6. Mantener `send_enabled=false`, `autosend_enabled=false`, `kill_switch=true`.
7. Cargar cuentas objetivo en `crm.intl_accounts`.
8. Crear research y evidence antes de gastar creditos.
9. Activar Apollo/Hunter solo cuando haya cuenta AAA o AA.
10. Usar Snov solo si hay API autorizada; si no, tarea manual.
11. Aprobar brief, compliance, template y contacto.
12. Marcar QUALIFIED con `crm_intl_mark_qualified()` solo si el contacto esta aprobado.
13. Un worker posterior procesa `crm.intl_integration_outbox` y crea/fusiona CRM comercial.

## Regla Operativa

V1 debe operar con:

- Presupuesto mensual proveedores: `0 USD`
- Autosend: apagado
- Envio real: apagado hasta readiness `READY`
- Maximo cinco contactos frios nuevos por dia
- Un contacto activo por cuenta
- Un solo follow-up
- Sin pixel de apertura
- Sin PDF adjunto ni QR en el primer email
- Sin telefonos ni emails personales

## Bloqueos Antes De Produccion

- Confirmar Google Workspace del buzon real.
- Confirmar direccion comercial y privacy URL.
- Aprobar claims de Geobooker Ads, Enterprise, Global y GeoScore.
- Definir jurisdicciones permitidas.
- Cargar API keys en secret manager.
- Implementar Edge Functions/adapters server-side.
- Implementar worker del outbox.
- Implementar UI admin para Strategic Accounts.
- Correr pruebas de RLS, suppression, costo, provider mocks, Gmail y outbox.
