# Geobooker Leads — modelo tenant/workspace

## Nombre recomendado

Usar `workspaces` como boundary técnico y `tenant` como concepto comercial. Un
workspace puede ser `internal_b2b` o `client_leads`.

## Entidades nuevas mínimas

### `crm.workspaces`

- `id`, `workspace_key`, `display_name`, `workspace_type`;
- país, moneda y timezone por defecto;
- estado, plan, fechas y metadata no sensible.

### `crm.workspace_users`

- workspace, user, role, estado;
- roles tenant: owner/admin/manager/agent/analyst/viewer;
- roles plataforma separados y nunca inferidos desde el frontend.

### `crm.workspace_access_audit`

- actor, workspace, action, reason, support ticket/reference y timestamp;
- obligatorio para acceso cross-tenant de Geobooker Support/Admin.

## Estrategia de migración

1. Crear workspace interno.
2. Añadir `workspace_id` nullable a entidades tenant-owned.
3. Backfill de datos CRM actuales al workspace interno con conteos antes/después.
4. Hacer `workspace_id` obligatorio en nuevas escrituras.
5. Añadir índices compuestos empezando por `workspace_id`.
6. Activar RLS usando membresía server-validated.
7. Probar dos tenants sintéticos y ataques de inferencia/export.
8. Sólo entonces habilitar portal cliente.

## Entidades tenant-owned

Accounts, contacts, permissions, campaigns, members, pipelines, opportunities,
tasks, conversations, messages, appointments, forms, submissions, costs,
revenues, files, reports y configuraciones de proveedor.

## Identidad

La misma persona puede aparecer en dos tenants sin compartir notas, mensajes,
consentimiento o actividad. Una tabla privada de identity resolution puede
detectar duplicación técnica, pero no debe exponer ni fusionar datos entre
clientes. Consentimiento siempre se evalúa por empresa remitente, finalidad,
canal y jurisdicción.

## RLS mínima

- `anon`: cero acceso CRM.
- usuario tenant: sólo workspaces activos donde tenga membresía.
- agente: filas asignadas o de su equipo según política.
- plataforma: funciones server-side con auditoría y propósito explícito.
- `service_role`: sólo backend; nunca navegador, PWA o apps móviles.

