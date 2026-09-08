# CRM Core — matriz de reutilización

| Capacidad | Activo actual | Decisión | Brecha |
|---|---|---|---|
| Accounts/Contacts | `crm.accounts`, `crm.contacts`, `crm.account_contacts` | Reutilizar | Scope por workspace y tipo de cuenta |
| Teléfono/email/WhatsApp | `crm.contact_points` | Reutilizar | Identidad tenant-aware |
| Consentimiento | `crm.channel_permissions`, `crm.consent_evidence` | Reutilizar | UI de captura/retiro e historial |
| Suppression | `crm.suppressions` | Reutilizar | Política global vs tenant claramente definida |
| Timeline | `crm.activities` | Reutilizar | Adapters de email, llamadas, Scan y Apify |
| WhatsApp | `crm.conversations`, `crm.messages`, eventos/jobs | Reutilizar | Número productivo, templates, multi-WABA |
| Email legado | `public.email_queue`, `campaign_history` | Compatibilidad temporal | Nuevo provider message adapter en `crm` |
| Apify | `marketing_contacts`, `scraping_history` | Fuente, no autoridad | Ingestion staging + promoción idempotente |
| Scan Local | `scan_runs`, `scan_leads`, `scan_lead_contacts` | Fuente, no autoridad | Adapter y provenance al core |
| CSV | `crm.import_*`, staging, dedupe | Reutilizar | Promoción/rollback operativo y XLSX UI |
| Pipelines | `crm.pipelines`, `pipeline_stages` | Reutilizar | Scope por workspace |
| Opportunities/Tasks | `crm.opportunities`, `crm.tasks` | Reutilizar | Tenant RLS y vistas 360 |
| Scoring | `crm.score_models`, `score_snapshots` | Extender | Fit/intent/engagement explicables |
| Attribution | `crm.attribution_touches` | Extender | Campaign ID fuerte, revenue events y windows |
| Campaigns | `crm.campaigns`, members/events/runs | Extender | Tenant, geo jerárquica, idioma y P&L |
| Markets | `crm.market_policies` | Reutilizar | Catálogo geográfico normalizado |
| Files | No hay core canónico comprobado | Crear mínimo | Object storage + metadata + tenant RLS |
| Calls | Actividad manual posible | Extender | Provider/event ID si se integra telefonía |
| Billing | Stripe/productos Geobooker existentes | Adapter | Suscripción/usage/fees de Leads |

## Regla de sincronización

Cada fuente produce un `source_event` idempotente. Un resolver decide si crea,
actualiza, vincula o manda a revisión. Después registra una actividad. Ningún
conector debe hacer upsert libre por nombre/teléfono directamente desde React.

