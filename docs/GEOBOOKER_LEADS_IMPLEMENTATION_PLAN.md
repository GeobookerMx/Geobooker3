# Geobooker Leads — plan de implementación

## Estado de entrada

- CRM Core, WhatsApp inbound/outbound queue, campaigns y atribución base: parcial.
- SQL internacional/consentimiento: aplicado por el administrador.
- Frontend/`whatsapp-admin` internacional: local, no desplegado.
- Producción Git: 13 commits detrás del workspace local.
- Envío: desactivado.

## Fase L0 — reconciliación y respaldo

- inventario producción vs Git vs migraciones;
- snapshot/rollback y verificación de conteos;
- desplegar únicamente después del release gate.

## Fase L1 — tenant foundation

- workspaces, memberships, roles, audit de soporte;
- backfill seguro del B2B actual al workspace interno;
- pruebas RLS de dos tenants y export isolation.

## Fase L2 — ingestion 360

- source events e idempotency registry;
- adapters para Apify, Scan Local, CSV/XLSX, formularios y email legado;
- resolver de identidad con `needs_review`;
- timeline unificada y reconciliación cero-pérdida.

Gate: todos los eventos aprobados aparecen una vez en Lead 360 y los conteos de
origen se pueden reconciliar.

## Fase L3 — Campaign Manager global

- país -> región -> ciudad -> postal/radio;
- idioma primario/secundarios, moneda y timezone;
- ICP, producto, canal, fechas, presupuesto y owner;
- templates ligados a WABA + idioma + propósito + market;
- dry run, aprobación, scheduling preview, pause y budget gates.

## Fase L4 — funnel y resultados

- leads y estados explícitos;
- routing, scoring explicable y appointments;
- opportunity/revenue events;
- first/last touch V1 y preparación multi-touch;
- cost ledger, rate cards y campaign P&L.

## Fase L5 — dashboards managed service

- ejecutivo por cliente/campaña;
- Owner Control Center de Geobooker;
- KPIs de revenue, margen, MRR, retención y client health;
- CSV y PDF bajo export auditado.

## Fase L6 — producción WhatsApp propia

- validar WABA, token, app subscription y billing;
- nuevo número y Phone Number ID productivo;
- templates ES/EN y luego idiomas por mercado;
- test bidireccional, estados, opt-out y rollback;
- abrir kill switch sólo con todos los gates en PASS.

## Fase L7 — producto cliente y Tech Provider

- portal tenant;
- cada cliente conecta su propio WABA;
- Embedded Signup/App Review/Advanced Access;
- entitlements, suscripción y usage billing;
- no usar indiscriminadamente el WABA de Geobooker para clientes.

## Orden inmediato

1. No volver a crear tablas de Leads antes de L1.
2. Diseñar y revisar la migración workspace/tenant.
3. Crear adapters 360 y pruebas de reconciliación.
4. Extender geografía/idioma.
5. Crear ledger/P&L y dashboards.
6. Desplegar el bloque acumulado con checklist y rollback.

