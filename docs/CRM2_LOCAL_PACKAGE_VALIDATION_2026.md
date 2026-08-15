# CRM 2.0 — validación local del paquete (2026-08-13)

## Alcance

Validación de sólo lectura sobre una copia temporal extraída de
`Geobooker_CRM2_Import_Package.zip`. No se cargaron datos a Supabase, no se
ejecutaron migraciones y no se enviaron comunicaciones. El ZIP original no fue
modificado.

## Resultado agregado

| Dataset | Filas esperadas | Filas observadas | Esquema | Filas malformadas |
|---|---:|---:|---|---:|
| Cuentas | 4,418 | 4,418 | PASS | 0 |
| Contactos | 15,617 | 15,617 | PASS | 0 |
| Supresiones | 447 | 447 | PASS | 0 |
| Contactos para revisión | 17 | 17 | PASS | 0 |

## Integridad y seguridad comercial

- IDs de cuenta, contacto y supresión: únicos.
- Relaciones de contactos con un `account_id`: cero referencias rotas.
- Contactos sin `account_id`: 2; permanecen como excepciones documentadas.
- Emails primarios duplicados: 0.
- Consentimiento email distinto de `unknown`: 0.
- Consentimiento WhatsApp distinto de `unknown`: 0.
- Archivo de revisión coincide exactamente con los 17 contactos marcados.
- Emails únicos en supresión: 447.
- Coincidencias de email primario con supresión: 2; coinciden con los flags.
- Coincidencias de email corporativo con supresión: 16; coinciden con los flags.
- Emails primarios inválidos: 15.

Resultado local: **PASS**.

## Automatización reproducible

El comando requiere un directorio ya extraído y sólo emite métricas agregadas:

```powershell
npm run test:crm-import-package -- "<directorio-extraido>"
```

El validador no imprime nombres, teléfonos, emails, compañías, asuntos ni otros
valores de las filas.

## Gate pendiente

Esta validación no sustituye ejecutar las migraciones en PostgreSQL/Supabase.
La máquina actual no tiene Supabase CLI, Docker, `psql` ni Deno. Antes de cerrar
la fase de import engine se necesita una base aislada donde probar:

1. aplicación y rollback de migraciones;
2. RLS para `anon`, `authenticated`, admin y `service_role`;
3. idempotencia del mismo checksum;
4. lotes de hasta 500 filas;
5. reconciliación de staging sin promoción a tablas canónicas.

