# Geobooker Stable 2.0 — Master Plan de cierre

Fecha base: 2026-09-07.

## Decisión de release

No se generarán builds móviles intermedios. El siguiente AAB de Android y el
siguiente archive de iOS se producirán después de congelar y certificar Web,
Auth, CRM 2.0, campañas, WhatsApp y GeoBot. Las pruebas de código y de integración
siguen siendo obligatorias, pero no implican crear builds de tienda anticipados.

## Arquitectura objetivo

```text
iOS / Android / PWA / Web
          |
Supabase Auth + API + Realtime
          |
CRM 2.0 + Campaigns + Attribution
          |
Email / WhatsApp server-side
          |
Meetings / Opportunities / Revenue
```

El CRM administrativo no debe depender del bundle móvil. Meta tokens, App
Secret, WABA, Phone Number ID, service keys y workers permanecen server-side.

## Fuente de verdad — auditoría inicial

- `whatsapp-webhook` desplegada: ACTIVE, versión 22, `verify_jwt=false`.
- `whatsapp-admin` desplegada: ACTIVE, versión 14, `verify_jwt=true`.
- El código descargado de ambas funciones y sus módulos compartidos coincide
  exactamente con Git.
- `whatsapp-send` existe en Git, pero no está desplegada.
- `whatsapp-worker` existe en Git, pero no está desplegada.
- El envío outbound fue refactorizado localmente: `whatsapp-send` sólo valida y
  encola; `whatsapp-worker` reclama jobs de forma atómica y realiza la entrega
  a Meta cuando `WHATSAPP_SEND_ENABLED=true`.
- La cola conserva idempotencia, retry/backoff, estados y fail-closed mientras
  el kill switch esté apagado.
- Existen 40 versiones locales ausentes del historial remoto. No usar `db push`
  hasta clasificarlas individualmente.

## Dependencia del nuevo número productivo

Puede completarse antes de adquirir el número:

- reconciliación de migraciones y roles;
- CRM, directorio, scoring, oportunidades, tareas y follow-ups;
- campañas, audiencia, dry run, aprobación y atribución;
- inbox, compositor, plantillas y diagnósticos;
- cola, worker, idempotencia, retry y dead-letter;
- consentimiento, suppression y opt-out;
- health de App, System User Token y WABA;
- seguridad, GeoBot, observabilidad y documentación.

Requiere el número real:

- alta u onboarding por Coexistence/Embedded Signup;
- Phone Number ID productivo y calidad/estado reales;
- separación final del número sandbox;
- prueba bidireccional real y estados de entrega;
- billing y activación final.

El número de prueba nunca se convertirá por inferencia en productivo.

## Fases y gates

### 0. Fuente de verdad y respaldo

Inventario de deploys, funciones, cron, triggers, colas, workers y secretos por
nombre. Comparación Git/producción y punto de restauración.

Gate: producción y Git reconciliados.

### 1. Base de datos y migraciones

Clasificar las 40 versiones divergentes como datos seed, obsoletas,
incorporadas por otra migración, necesarias o peligrosas. Crear migraciones
consolidadas, reversibles y pequeñas. Validar RLS y grants por rol.

Gate: esquema reproducible y sin drift desconocido.

### 2. Roles y ambientes

Implementar Owner/Super Admin, CRM Admin, Agent y Viewer. Separar payload de
prueba, ambiente, WABA y estado de teléfono. Normalizar nombres de variables sin
retirar alias antes de comprobar consumidores.

Gate: ningún usuario o evento cruza ambiente o privilegio.

### 3. CRM comercial

Cerrar Accounts, Contacts, Opportunities, Activities, Product Fit, scoring,
follow-ups, ownership, importación, deduplicación, consentimientos y
supresiones. Activar módulos CRM 2.0 por feature flag sólo después de validarlos.

Gate: ciclo comercial completo sin hojas externas.

### 4. WhatsApp inbound

Mensaje firmado a webhook, contacto/contact point, conversación, mensaje,
actividad, asignación, tareas, opt-out, revisión de duplicados y Realtime.

Gate: entrada visible en CRM sin refrescar y sin duplicados.

### 5. WhatsApp outbound confiable

Separar creación de job y procesamiento. Implementar worker con claim atómico,
revalidación de elegibilidad, envío Meta, `wamid`, retry/backoff y dead-letter.
El frontend nunca elige WABA/Phone Number ID ni recibe tokens.

Gate: salida idempotente y recuperable después de fallos temporales.

### 6. WhatsApp Center

Finalizar resumen, inbox, ficha lateral, ventana de 24 horas, compositor,
plantillas, errores, dead letters, métricas, checklist y lenguaje operativo.

Gate: el propietario entiende el estado en menos de 30 segundos.

### 7. Campañas profesionales

Draft, audiencia elegible, preview, compliance, dry run, aprobación,
programación, límites, presupuesto, ejecución, pausa, atribución y resultados.

Avance local: existe foundation SQL para `crm.campaigns`,
`crm.campaign_members`, `crm.campaign_events` y un resumen admin-only de
readiness. WhatsApp Center ya puede mostrar conteos agregados sin crear ni
enviar campañas. También existe un preview de audiencia WhatsApp, limitado y
de sólo lectura, para revisar elegibilidad antes de crear campañas.

Gate: campaña controlada sin contactar `unknown`, opted-out o suppressed.

### 8. GeoBot seguro

GeoBot sólo usa información pública. No accede a CRM privado, secretos, SQL,
listas de contactos ni métricas internas. Debe tener:

- system instruction separada del historial no confiable;
- filtro de entrada y salida contra exfiltración;
- credencial del proveedor en header, no URL;
- timeout, límite de cuerpo y rate limit;
- contexto de host/ruta allowlisted;
- redacción de emails, teléfonos, tokens y solicitudes sensibles en logs;
- retención y purga documentadas;
- fallback local y respuestas sin acciones autónomas;
- pruebas de prompt injection, PII y credential-shaped output.

Gate: no puede consultar datos privados y 100% de pruebas de seguridad en verde.

### 9. Seguridad, observabilidad y operación

Alertas, auditoría, health checks, backup/restore, rotación, dependencia
reproducible, CI, métricas y runbooks. Mantener dos gates de envío: secreto de
infraestructura y kill switch operativo; ambos deben permitir el envío.

Gate: incidentes detectables, explicables y reversibles.

### 10. Nuevo número productivo

Onboarding, IDs productivos, webhooks adicionales de Coexistence, billing,
plantillas, conversación real y certificación. Mantener envíos desactivados
hasta completar el checklist.

Gate: inbound + outbound + delivered + read + opt-out PASS con el número real.

### 11. Congelación web y móvil

Cerrar dependencias, Auth/OAuth, Premium, deep links, Maps, privacidad, backups,
crash reporting, lint y performance. Sincronizar Capacitor sólo después del
freeze.

Gate: un único commit/tag aprobado para Web, Android e iOS.

### 12. Builds finales

Bump de versión verificado contra tiendas, AAB firmado y archive iOS desde el
mismo tag. Cero secretos en artefactos.

## Estimación de planificación

- Fases 0–2: 2–4 jornadas efectivas.
- Fases 3–7: 8–14 jornadas efectivas.
- Fases 8–9: 3–5 jornadas efectivas.
- Fase 10: 2–5 jornadas efectivas después de disponer del número, además de la
  espera externa de Meta.
- Fases 11–12: 2–4 jornadas efectivas.

Rango total razonable: 17–32 jornadas efectivas, normalmente 4–7 semanas de
calendario. Meta, Business Verification, Coexistence y revisión de tiendas
pueden ampliar el calendario sin aumentar el trabajo de ingeniería.

## Regla de activación

`WHATSAPP_SEND_ENABLED` continuará en `false` hasta que los gates de Meta,
número productivo, consentimiento, plantillas, webhook, outbound worker,
presupuesto, observabilidad y rollback estén en PASS.
