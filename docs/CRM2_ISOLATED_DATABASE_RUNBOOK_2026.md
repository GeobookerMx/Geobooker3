# CRM 2.0 — runbook de base aislada

## Estado actual

No ejecutar SQL en producción. La validación local de los CSV terminó PASS.

El 15 de agosto de 2026 se validaron las cuatro migraciones CRM en la rama
Supabase Preview aislada `gdgammcggwvxhkoobgdy`, sin datos y separada del
proyecto productivo `dllckokqkgcraxyxsfqc`. El dry-run enumeró exclusivamente
las cuatro migraciones CRM, sin seeds ni roles. La consulta posterior confirmó
10/10 checks en PASS. Producción no contiene el esquema `crm` ni registra esas
cuatro versiones de migración.

## Requisito de aislamiento

Antes de ejecutar una migración se deben comprobar:

- nombre, Project ID y URL del proyecto de pruebas;
- confirmación de que el Project ID **no** es `geobooker-formulario`;
- base vacía o snapshot recuperable;
- Meta, Resend, n8n y Stripe desactivados;
- ningún secreto de producción copiado al entorno.

Si alguna condición falla, detener el proceso.

El esquema `crm` debe incluirse en los esquemas expuestos de la API Supabase
para que las Edge Functions puedan usar PostgREST. Esto no sustituye RLS ni
concede permisos: `anon` mantiene cero privilegios, `authenticated` no puede
escribir y sólo un administrador autenticado puede leer mediante las políticas
definidas. Debe configurarse explícitamente en API Settings. No ejecutar
`supabase config push` con el `config.toml` parcial del repositorio, porque los
valores locales predeterminados podrían sobrescribir Auth u otros servicios.

## Orden de migraciones CRM

Aplicar exclusivamente en la base aislada:

1. `20260813040000_crm_whatsapp_foundation.sql`
2. `20260813041000_crm_import_staging.sql`
3. `20260813042000_crm_sales_operations.sql`
4. `20260813043000_crm_admin_directory.sql`

Mantener apagados `WHATSAPP_SEND_ENABLED`, `CRM2_IMPORT_DRY_RUN_ENABLED`,
`VITE_CRM2_IMPORT_REVIEW_ENABLED`, `VITE_CRM2_OPERATIONS_ENABLED`, políticas
de presupuesto y modelos de scoring.

## Verificación inicial

Ejecutar después de las cuatro migraciones:

```text
supabase/validation/crm2_isolated_verification.sql
```

Los diez checks deben reportar `pass = true`. El archivo sólo consulta
catálogos, permisos y conteos; no modifica datos.

Resultado observado el 15 de agosto de 2026:

- esquema `crm`: presente;
- tablas esperadas: 37/37;
- RLS habilitado y forzado: 37/37;
- tablas accesibles para `anon`: 0;
- tablas modificables por `authenticated`: 0;
- RPC de staging y lectura administrativa: presentes;
- kill switch de salida: cerrado;
- cuentas, contactos, oportunidades, lotes y filas de staging: 0.

La comprobación REST inicial devolvió `PGRST106` hasta declarar `crm` en
`api.schemas`. Después de aplicar la configuración al Preview se debe repetir
una lectura vacía con `service_role` y exigir HTTP 200 antes de desplegar Edge
Functions.

El 15 de agosto de 2026 la lectura REST posterior respondió HTTP 200 con una
lista vacía. Durante ese ajuste, `supabase config push` también aplicó valores
Auth locales predeterminados al Preview: cambió temporalmente URL/redirecciones,
manual linking, MFA TOTP, confirmación/frecuencia de correo y desactivó Apple.
Producción no fue afectada. La restauración del Preview debe hacerse desde el
Dashboard con sus valores externos originales o con una configuración completa
previamente revisada; no volver a usar el archivo parcial para ese propósito.

## Ensayo posterior

Sólo después del PASS inicial:

1. probar un lote sintético pequeño;
2. repetir el checksum y comprobar idempotencia;
3. comprobar que `anon` y un usuario no administrador fallan;
4. comprobar lectura agregada con un administrador;
5. verificar rollback del entorno completo;
6. solicitar autorización separada para el paquete real.
