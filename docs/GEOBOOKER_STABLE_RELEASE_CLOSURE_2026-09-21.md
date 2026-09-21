# Geobooker — matriz de cierre para versión estable

Fecha: 2026-09-21

## Los tres frentes de producto

| Frente | Estado | Falta para cierre |
|---|---|---|
| WhatsApp Center + CRM | Operativo en canal individual; despacho y reservas atómicas implementados localmente con gates cerrados | Aplicar migración/worker en preview, validar, ejecutar piloto allowlisted de 1 contacto y BAJA E2E. |
| Search Intelligence V2 | Primera capa EN/ES implementada y probada localmente | Aplicar catálogo en preview, coordenadas de mercados, cobertura Overture, relevancia y telemetría. |
| GeoScore | Fases 1 y 2 locales: arquitectura, fuentes, modelo, esquema, RLS y flags fail-closed | Aplicar Fase 2 en preview; después ingestión, motor, UI, calibración y mobile. |

Completar estos frentes entrega el producto comercial objetivo, pero no reemplaza el release gate técnico.

## Gate transversal obligatorio

La auditoría y el programa operativo vinculante se encuentran en
`docs/GEOBOOKER_SECURITY_AND_360_PROGRAM_2026-09-21.md`. Su estado actual es
**PENDIENTE / NO-GO** y forma parte de este release gate.

### Plataforma y seguridad

- Reconciliar migraciones locales/remotas y crear respaldo restaurable.
- RLS, privilegios mínimos, secrets scan y auditoría de dependencias.
- Ningún token de Meta, Google, Supabase privilegiado o proveedor dentro del bundle.
- Feature flags server-side fail-closed para WhatsApp, Search V2 y GeoScore.
- Rate limits, cuotas, caché, circuit breakers y logs sanitizados.
- Contrato de eventos común entre PWA, iOS, Android y CRM.

### Flujos críticos

- Registro, login email/social/Apple y cierre de sesión.
- Recuperación de contraseña y callbacks en navegador/app instalada.
- Premium gratuito/pago, checkout y restauración de estado.
- Alta, edición, reclamo y eliminación de negocio/cuenta.
- Búsqueda, ubicación, mapas y resultados internacionales.
- Consentimiento, unsubscribe/BAJA y eliminación de datos.

### Android

- Misma versión web/tag que iOS.
- Keystore y Maps key inyectados/restringidos; nunca en Git.
- AAB firmado, versionCode, Asset Links, Data Safety y pruebas en dispositivo.

### iOS

- Misma versión web/tag que Android.
- Privacy Manifest, App Privacy, Associated Domains y AASA.
- Archive/TestFlight firmado y pruebas en iPhone real.
- Ubicación `When In Use`; GeoScore no necesita permiso permanente.

### Operación

- Métricas, alertas y rollback verificados.
- Prueba de backup/restore y RPO/RTO.
- Smoke test productivo con kill switches seguros.
- Freeze, commit/tag único y generación de ambos builds desde ese tag.

## Definición de terminado

La versión es **GO** únicamente si:

1. Los tres frentes pasan sus pilotos y no tienen errores P0/P1.
2. Los flujos críticos pasan en Web, Android e iOS.
3. No hay secretos expuestos ni permisos excesivos.
4. Android e iOS provienen exactamente del mismo release source.
5. Existe evidencia de rollback, observabilidad y recuperación.
6. Los hallazgos P0/P1 de seguridad, pagos, privacidad y fiscalidad están cerrados o aceptados formalmente con evidencia y responsable.

Hasta entonces pueden publicarse mejoras web controladas, pero no deben etiquetarse como build móvil final estable.
