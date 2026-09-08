# CRM 2.0 — reconciliación de producción (2026-09-08)

## Alcance y método

Revisión de solo lectura del proyecto Supabase enlazado. Se consultaron el
historial de migraciones y estadísticas de tablas; no se leyeron filas de
clientes, mensajes ni credenciales, y no se modificó producción.

## Resultado

- Las tablas de campañas, políticas internacionales y consentimiento existen
  físicamente en `crm`.
- Las migraciones desde `20260907020000` hasta `20260908011000` no aparecen en
  `supabase_migrations.schema_migrations`, aunque sus objetos sí existen. Esto
  es consistente con SQL ejecutado manualmente desde el Dashboard.
- No debe ejecutarse `supabase db push` ni marcar migraciones como reparadas
  hasta verificar cada objeto y función con
  `supabase/validation/crm_workspace_reconciliation_readonly.sql`.
- La migración `20260908012000_crm_workspace_foundation.sql` todavía requiere
  aplicación y validación explícitas. No habilita portal cliente ni envíos.

## Evidencia estructural relevante

Producción contiene datos repartidos entre el CRM nuevo y módulos legados:

- `crm`: cuentas/contactos, WhatsApp, conversaciones, mensajes, actividades,
  campañas, políticas de mercado, consentimiento y atribución base;
- `public`: `marketing_contacts`, `email_queue`, `campaign_history`,
  `email_analytics`, `scan_leads`, `scan_lead_contacts`, `scan_runs`, fuentes de
  scraping y colas WhatsApp heredadas.

Esto confirma que la siguiente fase debe usar adaptadores idempotentes y
reconciliación por conteos. No se deben fusionar ni borrar tablas legadas antes
de certificar equivalencia funcional y cero pérdida.

## Gate para aplicar la base workspace

1. Ejecutar respaldo administrado de Supabase.
2. Ejecutar la sección preexistente del script de validación o comprobar que
   todas las tablas raíz requeridas existen.
3. Aplicar `20260908012000_crm_workspace_foundation.sql` como una transacción.
4. Ejecutar `crm_workspace_foundation_status()` con una sesión administrativa.
5. Exigir `unscoped_rows = 0` y `total_rows = internal_rows` en todas las tablas.
6. Confirmar RLS forzada y cero privilegios directos para `anon` y
   `authenticated` sobre las nuevas tablas.
7. Sólo después reconciliar el historial de migraciones; nunca repararlo por
   nombre sin validar objetos y firmas de funciones.

## Estado operativo que no cambia

- `WHATSAPP_SEND_ENABLED=false`.
- Sin registro ni sustitución del número real.
- Sin cambio de WABA, Phone Number ID, tokens o App Secret.
- Sin portal de clientes ni acceso multi-tenant habilitado.

