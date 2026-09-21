# GEOBOOKER 2.0 — P0 RELEASE TRACKER

Fecha de corte: 2026-09-17

Este documento registra evidencia disponible. No habilita envíos ni sustituye
pruebas reales en Meta, Resend, GA4/Firebase o dispositivos.

## Estado ejecutivo

**Decisión actual: NO-GO para builds finales de tienda.**

La aplicación web compila y las 52 pruebas de seguridad existentes pasan. Los
builds móviles finales deben esperar al cierre de los gates siguientes, seguido
de freeze, commit/tag único y Release Candidate.

| Gate | Estado | Evidencia o bloqueo |
| --- | --- | --- |
| P0.0 esquema/migraciones y release source | FAIL | Existen migraciones locales/remotas por reconciliar y el worktree no está congelado en un tag reproducible. |
| P0.1 WhatsApp runtime | PASS | `whatsapp-send` v5 y `whatsapp-worker` v5 están ACTIVE, ambos con `verify_jwt=true`; sin JWT responden 401 y `WHATSAPP_SEND_ENABLED=false`. Ambos aplican guard comercial, template gate y límite global antes de encolar/procesar. El webhook v30 está ACTIVE con `verify_jwt=false`, HMAC obligatorio y opt-out automático. Incluye rate limit administrativo, auditoría, retry/backoff y dead-letter. |
| P0.2 WABA source of truth | PASS | WABA operativo recomendado `4731600213830930`, Phone Number ID `1358408147344707`, nombre Geobooker y app suscrita. No eliminar el WABA/alias alterno. |
| P0.3 templates mínimos | PROVIDER PASS / CAMPAIGN GATE CLOSED | Meta devolvió 28 plantillas APPROVED y sincronizadas. El gate CRM conserva 0 habilitadas, estado seguro para el piloto de servicio; aún falta corregir las anomalías nominales/locale y seleccionar explícitamente las plantillas del futuro piloto de marketing. |
| P0.4 consent/suppression | CODE READY / E2E PENDING | El webhook reconoce comandos exactos BAJA/STOP, registra `opted_out` para todas las finalidades WhatsApp, crea suppression auditable e idempotente y no permite que un mensaje posterior reactive permisos bloqueados. `whatsapp-send` y `whatsapp-worker` revalidan suppression y cualquier permiso global bloqueado. Las 54 pruebas pasan; falta certificar el recorrido real allowlisted opt-in → envío → opt-out → bloqueo futuro. |
| P0.5 fuentes/contactability | CODE READY / DATA E2E PENDING | `crm-import-dry-run` v1 está ACTIVE y `verify_jwt=true`; sin JWT responde 401. Clasifica fuentes públicas/scraping como `research_only`, exige E.164, país y evidencia completa, y nunca convierte un opt-in importado directamente en elegibilidad productiva. Falta reconciliar una muestra real de cada fuente y reason codes históricos. |
| P0.6 rate cards/presupuesto | STAGED / SERVICE PILOT SQL PENDING | Existen 15 rate cards oficiales observadas en borrador, presupuesto MXN 1,000/mes, límite global 20/día y alertas 50/80/100. El SQL del piloto añade tarifa de servicio MX en cero y activa solamente budget/service guards, manteniendo marketing, templates y `WHATSAPP_SEND_ENABLED=false` cerrados. |
| P0.7 piloto WhatsApp | READY TO STAGE / E2E PENDING | La ruta elegida es customer-initiated: `+52 55 2670 2368` escribe primero al número Cloud API y abre la ventana de servicio. Falta aplicar/validar el SQL de staging, registrar el inbound real y autorizar temporalmente un único reply. |
| P0.8 Email Center | PARTIAL | Cola, Resend webhook, unsubscribe y suppressions existen; falta evidencia DNS/reputación y piloto E2E. |
| P0.9 orquestación | PARTIAL | CRM 360/adapters existen; falta certificar atribución cruzada real. |
| P0.10 taxonomía de eventos | PARTIAL | Hay eventos web, app, CRM y provider; no existe aún un contrato canónico completo aplicado a todos. |
| P0.11 KPIs/hyperconnection | PARTIAL | Dashboards parciales; falta reconciliación por funnel y revenue. |
| P0.12 GA4/Firebase | PARTIAL | Código e integraciones existen; falta evidencia DebugView real en Web, Android e iOS. |
| P0.13 deep links | PARTIAL | AASA, Asset Links y entitlements existen; faltan pruebas físicas de la matriz instalada/no instalada/auth/fallback. |
| P0.14 Android RC | PARTIAL / SIGNING BLOCKED | compile/target SDK 36, versión 1.4.9 (57) y build web PASS. El último bundle release falló porque `RELEASE_STORE_FILE` apunta a `C:\RUTA\A\TU\geobooker-release.jks`; falta corregir la ruta local segura, eliminar el fallback hardcodeado de Maps del proceso de release, ejecutar clean bundle, verificar firma/Asset Links, Data Safety y dispositivo real. |
| P0.15 iOS RC | FAIL | Versión 1.4.9 (54), Associated Domains y AASA existen, pero no existe `PrivacyInfo.xcprivacy`; faltan alinear dominios canónicos, archive/TestFlight, App Privacy, firma y dispositivo real. iOS sólo puede archivarse/certificarse desde macOS/Xcode. |
| P0.16 backup/recovery | FAIL | No hay evidencia actual de restore test, RPO/RTO ni tabletop drill completado. |
| P0.17 security gate | PARTIAL | 54/54 pruebas pasan; faltan auditorías de dependencias/secrets/signing y evidencia E2E real. |
| P0.18 piloto final | BLOCKED | Depende de todos los gates anteriores. |

## Hallazgos de release móvil — 2026-09-17

- Android e iOS comparten la PWA, Supabase y rutas de autenticación, pero todavía
  no hay un tag reproducible que conecte backend, web y ambos binarios.
- El build Android no falla por código: falla en `validateSigningRelease` por una
  ruta placeholder del keystore. El keystore real está ignorado por Git y nunca
  debe incorporarse al repositorio.
- El directorio `android/app/release/` y el log local de build se excluyeron para
  impedir que AAB, comprobantes o artefactos locales entren al changeset.
- El lint global incluía builds generados, un proyecto externo y worktrees. Se
  acotó su alcance; quedan 53 errores y 25 advertencias reales en `src` que deben
  clasificarse y cerrar antes del freeze.
- Android contiene una Google Maps API key fallback. Una key móvil es extraíble
  por diseño, pero debe inyectarse durante el build y restringirse en Google
  Cloud por package name y certificados SHA-256; no debe depender de un fallback.
- Universal/App Links requieren matriz física para `auth/callback`,
  `reset-password`, negocio, anuncio y fallback web. Los hosts declarados no son
  completamente simétricos entre Android, iOS y las variantes de dominio.

## Orden cerrado de ejecución

1. Reconciliar migraciones, funciones desplegadas y configuración; crear punto
   de restauración.
2. Desplegar `whatsapp-send` y `whatsapp-worker` protegidos manteniendo
   `WHATSAPP_SEND_ENABLED=false`.
3. Someter y sincronizar el conjunto mínimo de plantillas ES/EN.
4. Completar rate cards, presupuesto, frequency caps y pruebas E2E de
   consentimiento/suppression.
5. Certificar piloto WhatsApp allowlisted y pequeño piloto de email.
6. Unificar eventos y comprobar GA4/Firebase/CRM/attribution en tráfico real.
7. Ejecutar matriz física de deep links, Android e iOS.
8. Añadir Privacy Manifest iOS, completar Data Safety/App Privacy y auditoría de
   signing/secrets.
9. Ejecutar backup/restore test, seguridad adicional y producción smoke test.
10. Congelar dependencias y configuración; commit/tag único; generar Android RC
    interno e iOS RC para TestFlight.
11. Corregir únicamente fallos del RC; crear un nuevo tag si cambia código.
12. Generar AAB y Archive final desde el mismo tag aprobado.

## Fuera del release gate

- Meta Connector/MCP: `P3 — DEFERRED`.
- Agente IA propio de WhatsApp: pendiente de evaluación posterior.
- Todos los países/idiomas: no son requisito para 2.0.
- Campañas masivas: prohibidas durante la certificación.

El endpoint local del connector puede mantenerse inerte sólo mientras sus
mutaciones y el agente productivo estén desactivados, su autenticación
server-to-server siga activa y no sea presentado como función operativa.

## Condición para iniciar builds

Se puede iniciar el RC móvil sólo cuando P0.0–P0.17 estén en PASS. P0.18 se
ejecuta con los RC y debe quedar PASS antes de publicación general.
