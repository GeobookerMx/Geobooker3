# Geobooker — auditoría preliminar de seguridad y programa 360

Fecha de corte: 2026-09-21  
Estado: **PENDIENTE / RELEASE GATE NO-GO**  
Alcance: PWA, Netlify, Supabase, CRM 2.0, WhatsApp Cloud API, Stripe, Search, GeoScore, Android, iOS, IA, operación comercial, fiscal y financiera.

## Decisión ejecutiva

No es técnicamente posible garantizar ausencia absoluta de vulnerabilidades. El objetivo de Geobooker debe ser reducir probabilidad e impacto, detectar temprano, responder, recuperar y conservar evidencia. Este documento convierte la revisión en un control recurrente basado en NIST CSF 2.0, OWASP ASVS/MASVS y controles de pagos.

No se autoriza producción estable ni builds móviles finales mientras exista un hallazgo P0 o un P1 sin mitigación, responsable, evidencia y aceptación formal del riesgo.

## Alcance y límites de esta revisión

Esta es una auditoría estática y no destructiva del repositorio y su configuración local. No incluyó pentest intrusivo, explotación, acceso a producción, rotación de secretos, revisión legal vinculante ni dictamen fiscal. Esos ejercicios requieren ventana controlada, respaldo, autorización específica y, donde corresponda, especialista externo.

## Resumen de hallazgos

| ID | Severidad | Área | Hallazgo | Decisión previa a producción |
|---|---|---|---|---|
| SEC-01 | P0 | Credenciales | Existen archivos versionados con nombres de credenciales Apple y un archivo de firma Android. Su contenido no fue abierto ni mostrado. El historial Git confirma presencia histórica. | Presumir exposición, inventariar alcance, rotar lo que corresponda y limpiar el historial de forma coordinada. La keystore será gestionada manualmente por el propietario durante el build; nunca debe quedar en Git. |
| SEC-02 | P1 | Android | Google Maps tiene un valor de respaldo embebido en Gradle; `allowBackup=true`; release usa `minifyEnabled=false`. | Eliminar fallback, restringir clave por package/SHA/API/cuota, definir política de backup y activar hardening compatible antes del AAB final. |
| SEC-03 | P1 | iOS/privacidad | No se encontró `PrivacyInfo.xcprivacy`; existe declaración de ubicación permanente además de `When In Use`. | Crear/revisar Privacy Manifest y App Privacy; retirar permiso permanente si no se solicita realmente. |
| SEC-04 | P1 | Stripe | La firma del webhook se valida, pero no se encontró deduplicación persistente por `stripeEvent.id`. Un replay puede repetir efectos laterales. | Crear inbox de eventos Stripe con `event_id UNIQUE`, estados y transacción/reintentos idempotentes. |
| SEC-05 | P1 | Fiscal | Se infiere `export_0_iva` solo porque el país de facturación no es México. Eso no prueba por sí mismo los requisitos fiscales de exportación. | Usar `pending_tax_review`; conservar evidencia y reglas aprobadas por contador fiscal mexicano antes de emitir/finalizar CFDI. |
| SEC-06 | P1 | Web/XSS | CSP permite `unsafe-inline` y `unsafe-eval`. | Migrar a nonces/hashes, eliminar dependencias que requieran eval y aplicar CSP primero en report-only. |
| SEC-07 | P1 | Privilegios | El Edge SEO prioriza `service_role` para lecturas públicas. | Sustituir por anon+RLS o RPC estricta de solo lectura. |
| SEC-08 | P1 | WhatsApp | La función heredada `generate-whatsapp-queue` puede convivir con el nuevo despacho atómico/consent-safe. | Desactivar o hacer que delegue exclusivamente al gate nuevo; probar que no pueda saltarse consentimiento, presupuesto, frecuencia o kill switch. |
| SEC-09 | P1 | Secretos | `.env.production` y archivos `apple-*.txt` están versionados. No se inspeccionaron ni se reproducen valores. | Clasificar cada valor como público/privado, rotar privados, retirar archivos e impedir recurrencia en CI. |
| SEC-10 | P2 | API/CORS | Persisten endpoints con CORS `*`; algunos tienen autenticación adecuada, pero la política es inconsistente y ciertos errores pueden revelar detalles internos. | Estandarizar allowlist, autenticación por función y errores sanitizados. CORS no sustituye autorización. |
| SEC-11 | P2 | Mobile links | Android acepta esquema personalizado `geobooker://`; los enlaces personalizados pueden ser interceptados por otra app. | Preferir App/Universal Links verificados; mantener custom scheme solo como fallback con PKCE, `state` y validación estricta. |
| SEC-12 | P2 | IA/datos | GeoBot, Meta Business Agent y knowledge files pueden recibir PII, prompt injection o información contradictoria. | Datos públicos solamente, retención limitada, redacción, tool allowlist, sin SQL/secrets, evaluación de fuga y handoff humano. |
| SEC-13 | P2 | Continuidad | El release gate exige backup/restore, RPO/RTO y rollback, pero falta evidencia reciente de restauración completa. | Ejecutar restore aislado y tabletop de incidente antes del GO. |

## Evidencia positiva verificada

- `npm audit --omit=dev` al 2026-09-21: **0 vulnerabilidades conocidas** en dependencias de producción (329 directas/transitivas de producción reportadas; 1,031 totales en metadata). Esto no cubre Gradle, CocoaPods/SPM, servicios cloud ni lógica de negocio.
- Stripe valida la firma del webhook con `constructEvent`.
- Checkout calcula precios relevantes desde autoridad server-side y restringe URLs de retorno.
- WhatsApp valida HMAC y conserva kill switch; el nuevo diseño incorpora consentimiento, frecuencia, presupuesto e idempotencia.
- CRM privilegiado mantiene separación de `anon`/`authenticated` en los gates verificados.
- Netlify aplica HSTS, protección de frames, `nosniff`, Referrer Policy y Permissions Policy.

## Gate obligatorio antes de producción

### A. Secretos e identidad

- [ ] Inventario de secretos, dueños, uso y fecha de rotación.
- [ ] Rotar credenciales Apple potencialmente expuestas y verificar revocación anterior.
- [ ] El propietario gestiona la keystore Android fuera del repositorio; registrar solo alias/huella pública necesaria.
- [ ] Quitar material sensible del árbol y del historial Git con backup y coordinación de todos los clones.
- [ ] Reglas CI que bloqueen `.env`, `.jks`, `.keystore`, `.p8`, `.p12`, private keys y tokens.
- [ ] MFA resistente a phishing para Git, Supabase, Netlify, Meta, Stripe, Apple y Google; cuentas individuales, no compartidas.

### B. Pagos, finanzas y fiscal

- [ ] Inbox idempotente de Stripe por `event.id`, transacción y replay test.
- [ ] Conciliación: Stripe gross/fees/net ↔ pedido/campaña ↔ factura ↔ banco.
- [ ] Webhooks de refund, dispute, chargeback, failed payment y async payment.
- [ ] Separación de funciones: quien cambia precios no concilia ni reembolsa sin segunda aprobación.
- [ ] Límites de reembolso, bitácora inmutable y alertas por anomalía.
- [ ] Sustituir inferencia automática de IVA 0% por revisión fiscal y evidencia de requisitos aplicables.
- [ ] Revisar obligaciones SAT, CFDI, privacidad, términos, cancelación y retención con contador/abogado mexicanos.
- [ ] Confirmar alcance PCI/SAQ con Stripe; no almacenar PAN, CVC ni datos completos de tarjeta.

### C. Aplicación, API y datos

- [ ] RLS/privilegios mediante tests negativos para `anon`, `authenticated`, admin y service role.
- [ ] Service role solo donde sea inevitable; nunca en frontend o lecturas SEO públicas.
- [ ] Rate limiting por IP, usuario, tenant y operación costosa; cuotas y circuit breakers.
- [ ] Validación de esquema, tamaño, MIME, antivirus y fórmula CSV/XLSX en importaciones.
- [ ] CSP sin `unsafe-eval` y reducción progresiva de `unsafe-inline`.
- [ ] SAST, secret scan, dependency scan, IaC/config scan y DAST autenticado en preview.
- [ ] Logs sin tokens, payloads completos, códigos de consentimiento ni PII innecesaria.
- [ ] Retención, exportación y eliminación de datos verificables.

### D. Android e iOS

- [ ] Android Maps key restringida; backup, exported components, Network Security Config y release shrinking revisados.
- [ ] iOS Privacy Manifest/App Privacy y permisos mínimos verificados.
- [ ] App Links/Universal Links, OAuth PKCE/state y recuperación de contraseña probados en dispositivos reales.
- [ ] SBOM móvil, escaneo de binarios y verificación de que los bundles no contienen secretos.
- [ ] AAB y Archive/TestFlight generados desde el mismo tag aprobado.

### E. Operación y recuperación

- [ ] Backup cifrado y restauración completa en entorno aislado.
- [ ] RPO/RTO aprobados para CRM, pagos, cuentas y mensajes.
- [ ] Alertas por 5xx, auth spikes, webhook failures, cambios de roles, costos y exportaciones.
- [ ] Runbooks para fuga de secreto, fraude, ransomware, indisponibilidad, pérdida de datos y abuso de mensajería.
- [ ] Contactos de emergencia y criterio de apagado de WhatsApp/campañas/IA/pagos.
- [ ] Rollback probado y smoke tests con kill switches cerrados.

## Programa semestral de auditoría de seguridad

### Mes 1 — Gobierno, activos e identidad

- Inventario de sistemas, datos, proveedores, responsables y criticidad.
- Threat model de registro, auth, CRM, WhatsApp, pagos, importador, Search, GeoScore e IA.
- Auditoría de accesos/MFA, secretos e historial Git.
- Entregables: matriz de activos, riesgos, acceso y plan P0/P1.

### Mes 2 — Aplicación, API y base de datos

- OWASP ASVS, RLS, IDOR/BOLA, inyección, XSS, CSRF, SSRF, uploads, CORS y rate limits.
- SAST/DAST en preview y pruebas negativas de roles/tenants.
- Entregables: reporte técnico, pruebas reproducibles y remediaciones verificadas.

### Mes 3 — Pagos, fraude, finanzas y fiscal

- Stripe idempotency/replays, precios server-side, refunds, disputes y conciliación.
- PCI scope y seguridad de página de pago.
- Muestreo fiscal con contador: IVA, exportación, CFDI, evidencia, ingresos diferidos y reembolsos.
- Entregables: matriz financiera, conciliación y dictamen/criterio profesional externo.

### Mes 4 — Mobile y privacidad

- OWASP MASVS para almacenamiento, criptografía, auth, red, plataforma, código, resiliencia y privacidad.
- Firmas, llaves, deep links, permisos, tracking, Data Safety y App Privacy.
- Entregables: checklist por versión/dispositivo y evidencia de binario.

### Mes 5 — Resiliencia y respuesta

- Restore test, failover, RPO/RTO y degradación de proveedores.
- Tabletop: filtración, secuestro de admin, fraude, borrado y caída de Meta/Stripe/Supabase.
- Entregables: tiempos medidos, gaps y runbooks corregidos.

### Mes 6 — Validación independiente y decisión ejecutiva

- Pentest independiente web/API/mobile con alcance autorizado.
- Re-test de hallazgos; revisión de riesgo residual y proveedores.
- Entregables: informe ejecutivo, carta de cierre, backlog del siguiente semestre y decisión GO/NO-GO.

### Cadencia continua dentro del semestre

- Semanal: alertas críticas, webhooks, errores, fraude, gasto y backups.
- Mensual: dependencias, secretos, Supabase Advisor/RLS, accesos privilegiados, costos y retención.
- Trimestral: restauración parcial, rotación planificada, accesos, proveedores, fiscal/conciliación y simulacro.
- Por release: pruebas críticas, SBOM, firmas, scan de bundles, rollback y aprobación de dos personas.
- Ante incidente crítico: auditoría extraordinaria sin esperar al ciclo semestral.

## Programa semestral de mejoras 360

| Mes | Objetivo | Indicadores de aceptación |
|---|---|---|
| 1 | Confiabilidad y observabilidad | SLO por servicio, error budget, dashboards, trazas/correlation ID, alertas accionables. |
| 2 | Calidad de búsqueda internacional | Precision@20, zero-results, idioma/país, latencia p95, cobertura Overture/propia y feedback. |
| 3 | CRM/WhatsApp comercial seguro | Consent rate, delivery/read/reply, BAJA, frecuencia, costo por respuesta/reunión; cero bypass del gate. |
| 4 | GeoScore y calidad de datos | Cobertura, frescura, provenance, confidence, drift, explicabilidad y calibración contra resultados reales. |
| 5 | Mobile, UX y accesibilidad | Paridad Web/iOS/Android, crashes/ANR, Core Web Vitals, WCAG, deep links y funnels críticos. |
| 6 | Revenue y operación | Conversión, CAC, margen por campaña, conciliación, churn, soporte, cumplimiento de SLO y roadmap siguiente. |

Cada iniciativa debe tener owner, presupuesto, fecha, métrica inicial, meta, riesgo, rollback y evidencia. No se considera “mejora” una función sin telemetría, soporte y costo operativo conocido.

## Riesgos que requieren especialista externo

- Fiscal/contable: clasificación IVA 0%, exportación de servicios, CFDI, reconocimiento y conciliación.
- Legal/privacidad: avisos, consentimiento por canal/país, transferencias internacionales, derechos ARCO y retención.
- Pentest: proveedor independiente sin acceso previo al diseño, con reglas de compromiso.
- PCI: validación del SAQ aplicable según la integración final de Stripe.

## Referencias normativas

- NIST Cybersecurity Framework 2.0: https://www.nist.gov/cyberframework
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP MASVS: https://mas.owasp.org/MASVS/
- PCI SSC SAQ A / e-commerce eligibility: https://www.pcisecuritystandards.org/faqs/1439/
- SAT, Ley del IVA, artículo 29: https://wwwmat.sat.gob.mx/articulo/80321/articulo-29

## Cierre

Estado de este gate: **PENDIENTE**.  
Producción estable: **NO-GO**.  
Próxima acción: completar los tres frentes funcionales actuales; después ejecutar la remediación P0/P1, preview, pentest y validación fiscal antes del release móvil final.
