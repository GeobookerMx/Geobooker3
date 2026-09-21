# GEOBOOKER 2.0 — STABLE RELEASE MASTER PLAN

Fecha de corte: 2026-09-17

## Resultado objetivo

Entregar una sola versión reproducible de Geobooker en Web/PWA, Android e iOS,
con CRM 2.0 y canales comerciales conectados al mismo backend, sin secretos en
clientes y con evidencia suficiente para pasar de desarrollo continuo a una
operación enfocada en publicidad, posicionamiento y campañas medibles.

## Arquitectura que se conserva

```text
Web/PWA + Android + iOS
          |
          v
Supabase Auth + API/Edge Functions + CRM 2.0
          |
          +--> Email / Resend
          +--> WhatsApp Cloud API
          +--> Ads / Stripe / Analytics
          |
          v
Accounts -> Contacts -> Consent -> Campaign -> Message -> Activity
         -> Opportunity -> Sale -> Attribution -> Revenue
```

Las apps móviles no contienen lógica CRM privilegiada ni secretos. Son clientes
de la misma plataforma y consumen únicamente APIs públicas o autenticadas.
WhatsApp, email, pagos, IA y tareas administrativas permanecen server-side.

## Camino crítico restante

### Checkpoint WhatsApp — 2026-09-17

- `Geobooker` (`3176918089184321`) es la app Cloud API suscrita al WABA.
- `Business Agent` (`1143680903703001`) es la integración auxiliar esperada
  tras configurar Meta Business Agent; no debe eliminarse para resolver el
  piloto. Meta Business Agent puede operar junto a WhatsApp Business Platform.
- 28 plantillas están aprobadas/sincronizadas, pero 0 permanecen habilitadas
  para campañas.
- 15 rate cards permanecen en borrador y el envío global sigue desactivado.
- La primera prueba real será una conversación de servicio iniciada por el
  número Geobooker de atención; no será una campaña de marketing.

### Fase 1 — Cerrar CRM y mensajería P0

1. Aprobar y sincronizar las 12 plantillas WhatsApp canónicas.
2. Versionar rate cards, presupuesto, frequency caps y alertas.
3. Uniformar provenance/contactability y reason codes de importaciones.
4. Ejecutar piloto allowlisted de WhatsApp: opt-in, template, sent, delivered,
   read, reply, BAJA y bloqueo posterior.
5. Certificar Email Center: SPF, DKIM, DMARC, rebotes, complaints, unsubscribe y
   piloto reducido.
6. Mantener Connector/MCP fuera del camino crítico.

### Fase 2 — Una sola telemetría comercial

1. Publicar el contrato de eventos canónicos con `event_id`, versión, ambiente,
   plataforma, campaña y entidades CRM.
2. Reconciliar eventos Web/PWA/Android/iOS con CRM y proveedores.
3. Cerrar KPIs de adquisición, contacto, respuesta, reunión, oportunidad,
   venta, costo y revenue atribuido.
4. Medir GeoBot por solicitudes, fallback, handoff, tokens y presupuesto; no
   compartir memoria privada con WhatsApp.

### Fase 3 — Hardening de aplicación compartida

1. Resolver los 53 errores y revisar las 25 advertencias reales de lint.
2. Corregir `pattern-dots.svg`, dividir el chunk pesado de WhatsApp y revisar el
   uso de `eval` de `google-libphonenumber`.
3. Ejecutar regresión de login, recuperación, Premium, registro/reclamo,
   búsqueda, mapa, Ads, checkout y panel administrativo.
4. Ejecutar auditoría de dependencias y escaneo de secretos sobre el changeset
   limpio.

### Fase 4 — Android Release Candidate

1. Inyectar Google Maps key sin fallback y restringirla por
   `com.geobooker.app` más certificados válidos.
2. Corregir `RELEASE_STORE_FILE` local sin copiar el keystore al repositorio.
3. Sincronizar Capacitor desde el mismo build web congelado.
4. Generar AAB release limpio, validar firma, versionCode y Firebase.
5. Verificar Asset Links, OAuth, password recovery, deep links, ubicación,
   mapas, consentimiento y Data Safety en dispositivo real.

### Fase 5 — iOS Release Candidate

1. Crear y agregar `PrivacyInfo.xcprivacy` con declaraciones verificadas.
2. Alinear Associated Domains/AASA con los hosts canónicos realmente servidos.
3. Sincronizar Capacitor desde exactamente el mismo tag que Android.
4. Generar Archive en macOS/Xcode, validar firma, App Privacy y ATT.
5. Probar OAuth, password recovery, Universal Links, ubicación, mapas y
   checkout en iPhone real/TestFlight.

### Fase 6 — Resiliencia y freeze

1. Incorporar `package-lock.json` al release source para que Web, Android e iOS
   resuelvan exactamente las mismas dependencias.
2. Reconciliar migraciones aplicadas manualmente con el historial remoto sin
   ejecutar un `db push` ciego.
3. Ejecutar backup y restauración de prueba; documentar RPO/RTO.
4. Hacer smoke test de producción con kill switches cerrados.
5. Congelar código, dependencias y configuración en un commit/tag único.
6. Generar los binarios finales de Android e iOS desde ese tag aprobado.
7. Despliegue gradual con observabilidad y rollback.

## Criterio GO

El release es GO sólo cuando:

- CRM 360 conserva fuente, consentimiento, actividades y atribución;
- WhatsApp y email pasan pilotos controlados y supresiones reales;
- no existen secretos en bundles y las funciones privilegiadas fallan cerradas;
- login, recovery, Premium, pagos y deep links pasan en Web, Android e iOS;
- Android AAB e iOS Archive provienen del mismo tag y backend;
- analítica distingue ambiente/plataforma y reconcilia conversiones;
- backup/restore y rollback tienen evidencia;
- no quedan errores P0/P1 abiertos.

## Operación comercial posterior

Después del GO, el trabajo se organiza como operación comercial:

1. campañas pequeñas por ICP, país, ciudad, idioma y producto;
2. consentimiento y suppression antes de cada activación;
3. una hipótesis y una variable A/B por experimento;
4. KPIs: elegibilidad, entrega, lectura, respuesta, baja, lead cualificado,
   reunión, propuesta, venta, CAC y revenue atribuido;
5. expansión país por país sólo cuando existan política, plantilla, landing,
   soporte y presupuesto aprobados;
6. ciclos mensuales de mantenimiento y seguridad separados del calendario
   comercial.

## Responsabilidades inmediatas

### Administrador Geobooker

- terminar el alta de plantillas en Meta y avisar cuando cambien a APPROVED;
- conservar de forma segura keystore/passwords Android y acceso Apple/Xcode;
- proporcionar dispositivos/cuentas de tienda para pruebas finales;
- no habilitar envíos hasta el piloto controlado.

### Implementación técnica

- cerrar los gates P0 restantes y mantener el tracker con evidencia;
- preparar SQL/migraciones reconciliables, pruebas y rollback;
- corregir hardening compartido y preparar proyectos nativos;
- entregar checklist exacto para Play Console y App Store Connect;
- generar artefactos finales sólo después del freeze.
