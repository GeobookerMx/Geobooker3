# B2B vs Geobooker Leads — mapa de dominios

## Regla

Comparten tecnología e identidad base; no comparten automáticamente propiedad,
audiencias, pipelines, permisos ni datos comerciales.

| Dominio | Geobooker B2B | Geobooker Leads | Compartido |
|---|---|---|---|
| Propósito | Conseguir clientes/partners para Geobooker | Conseguir clientes para un cliente de Geobooker | CRM Core |
| Dueño de datos | Geobooker | Tenant cliente bajo contrato | Auditoría/seguridad |
| Accounts | Anunciantes, partners, proveedores | Prospectos/clientes del tenant | Tipo y estructura base |
| Contacts | Decisores para Geobooker | Leads del tenant | Identidad/contact points con scope |
| Pipeline | Ventas internas | Pipeline configurable por tenant | Motor de etapas |
| Campaigns | Oferta propia Geobooker | Campaña administrada para cliente | Orquestación y eventos |
| WABA | WABA propio | WABA del cliente en fase Tech Provider | Abstracción proveedor |
| Revenue | Ingreso directo de Geobooker | Resultado del cliente + fee/margen Geobooker | Ledger con dos perspectivas |
| Dashboard | Owner/ventas internas | Ejecutivo del cliente | Motor de métricas |

## Implementación recomendada

- Crear un workspace reservado `geobooker_internal` para B2B.
- Crear un workspace por cliente de Leads.
- Añadir scope obligatorio a entidades tenant-owned.
- Mantener una sola tabla física cuando semántica, retención y seguridad sean
  compatibles.
- Crear tablas separadas sólo cuando la propiedad sea distinta: contratos,
  suscripciones, costos, facturación, tenant roles y client reports.

## Respuestas obligatorias

- ¿Duplica B2B? No, si se adopta el core compartido y adapters descritos.
- ¿Mismo CRM Core? Sí: schema `crm`.
- ¿Datos aislados hoy? No todavía; falta `workspace_id`/tenant RLS.
- ¿ROI cliente y margen Geobooker independientes hoy? No completamente; falta
  ledger comercial con ambas perspectivas.

