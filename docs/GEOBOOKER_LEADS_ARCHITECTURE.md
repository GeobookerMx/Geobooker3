# Geobooker Leads — arquitectura objetivo

Estado: decisión arquitectónica previa a multi-tenancy. No autoriza envíos ni
cambios destructivos.

## Decisión

Geobooker Leads será una unidad de producto dentro del CRM 2.0 existente. No se
creará otro CRM ni un schema `crm_core` duplicado. El schema `crm` será el core
compartido y se dividirá por contexto de negocio y workspace/tenant.

```text
Fuentes (Search, Ads, Forms, Apify, Scan, CSV, API)
                         |
            Ingestion + provenance + consent
                         |
          Identity resolution / dedupe review
                         |
              CRM Core compartido (`crm`)
                /                         \
     B2B interno Geobooker        Leads por tenant cliente
                \                         /
 Activities + Messages + Tasks + Pipeline + Attribution
                         |
          Revenue, campaign P&L y client reporting
```

## Fuente de verdad 360

- `crm.accounts`, `crm.contacts`, `crm.contact_points` serán identidad canónica.
- `crm.activities` será la línea de tiempo común para email, llamada, WhatsApp,
  reunión, cambio de etapa, importación y notas.
- `crm.conversations`, `crm.messages` y `crm.message_status_events` serán la
  autoridad de mensajería.
- `crm.channel_permissions`, `crm.consent_evidence` y `crm.suppressions` serán
  la única barrera de elegibilidad.
- `crm.attribution_touches` enlazará fuente/campaña con contacto, oportunidad e
  ingreso.
- Todo conector conservará `source`, external ID, timestamp, checksum y payload
  mínimo para idempotencia y auditoría.

## Hallazgo actual

La vista 360 todavía es parcial. Apify escribe `public.marketing_contacts`, Scan
Local usa `public.scan_*`, email histórico usa `public.email_queue` y
`public.campaign_history`, mientras WhatsApp Cloud API e importación CRM 2.0
usan `crm`. No hay una promoción/sincronización canónica completa entre todas
esas rutas.

No se eliminarán las tablas legadas. Se crearán adapters server-side
idempotentes para promover eventos aprobados al core y mantener compatibilidad
durante la transición. La sincronización no será bidireccional ciega.

## Límites de V1

- Managed service interno primero.
- Sin portal cliente ni WABA multi-tenant hasta probar aislamiento.
- Sin automatización que envíe por sí sola.
- Sin convertir intent anónimo en persona identificada.
- Sin mezclar datos entre clientes para scoring individual.
- Benchmarks sólo agregados con umbral mínimo de muestra.

## Gates

1. Workspace interno creado y datos actuales asociados sin pérdida.
2. Tenant isolation probado para SELECT/INSERT/UPDATE/export.
3. Connectors escriben por ingestion service, no directamente al core.
4. Timeline 360 reconciliada por conteos y external IDs.
5. Consentimiento/suppression bloquea todos los canales afectados.
6. Costos e ingresos separados por tenant, campaña, moneda y periodo.
7. `WHATSAPP_SEND_ENABLED=false` hasta número productivo y checklist completo.

