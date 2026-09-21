# GEOBOOKER 2.0 READINESS AUDIT

Fecha: 2026-09-14

Alcance: auditoría de código y documentación local. No activa envíos, no cambia
secrets, WABA, número productivo ni configuración de Meta.

## Decisión ejecutiva

Geobooker ya tiene una base amplia de CRM y WhatsApp, pero todavía no debe
habilitar campañas reales a escala. El siguiente objetivo correcto es un piloto
productivo controlado con destinatarios consentidos. Meta Business Agent
Connector/MCP queda fuera del camino crítico y no debe consumir más tiempo en
esta etapa.

## A. Readiness por módulo

| Módulo | Estado | Evidencia actual | Falta principal | Prioridad |
| --- | --- | --- | --- | --- |
| Web/PWA build | PASS con advertencias | `npm run build` termina correctamente | Reducir chunks grandes y resolver aviso de `pattern-dots.svg` | P1 |
| Seguridad automatizada | PASS | 48/48 pruebas de seguridad en verde | Añadir pruebas de presupuesto/tokens y E2E reales | P0 |
| CRM account-centric | PARTIAL | Esquema `crm`, Accounts, Contacts, Opportunities, Activities y workspace foundation | Certificar integridad 360 y evitar modelos paralelos heredados | P0 |
| Importación/provenance | PARTIAL | Importador, adapters e infraestructura internacional presentes | Staging/quarantine y reason codes uniformes para todas las fuentes | P1 |
| Audience/Campaign Studio | PARTIAL | Readiness, preview, draft, approval y dispatch preflight sin envío | Ejecución controlada, pausa, presupuesto y resultados E2E | P0 |
| WhatsApp inbound | PARTIAL | Webhook, HMAC, idempotencia y sandbox certificados | Certificar mensaje real productivo y estados reales | P0 |
| WhatsApp outbound | MISSING en runtime | `whatsapp-send` y `whatsapp-worker` existen en Git; la auditoría previa no los encontró desplegados | Desplegar protegidos con kill switch cerrado y probar cola/worker | P0 |
| WhatsApp templates | PARTIAL | Sincronización implementada; sólo `hello_world` aprobado/sincronizado | Aprobar conjunto mínimo ES/EN y probar calidad/variables | P0 |
| Consent/suppression | PARTIAL | Tablas, gates y pruebas unitarias presentes | Probar captura de evidencia, opt-out real y bloqueo E2E | P0 |
| Costos WhatsApp | PARTIAL | `crm.budget_policies` y `crm.usage_ledger` | Rate cards vigentes, moneda, conciliación y alertas | P0 |
| GeoBot PWA | PARTIAL | Gemini server-side, fallback local, guardas, rate limit e historial limitado | Guardar `usageMetadata`, presupuesto y límites diarios/mensuales | P1 |
| Meta Business Agent | PARTIAL | Knowledge y sandbox disponibles | Medición/contrato de costo no confirmado; producción desactivada | P2 |
| Meta Connector/MCP | BLOCKED_EXTERNALLY / DEFERRED | Meta rechaza creación con HTTP 400 | No es necesario para campañas ni CRM actual | P3 |
| Email Center | PARTIAL | Cola/Resend y CRM existentes | SPF/DKIM/DMARC, webhooks, suppression y warm-up E2E | P0 |
| Analítica/atribución | PARTIAL | Servicios y eventos existen en distintas capas | Diccionario canónico y reconciliación server-side | P0 |
| Android | PARTIAL | compile/target SDK 36; versionCode 57, versionName 1.4.9 | RC, firma segura, Data Safety, pruebas reales y staged rollout | P0 |
| iOS | PARTIAL / SECURITY_RISK | Associated Domains y AASA existen | Falta `PrivacyInfo.xcprivacy`; cerrar privacidad, firma y TestFlight | P0 |
| Deep links | PARTIAL | `assetlinks.json`, AASA y entitlements presentes | Validación en dispositivo y de parámetros no confiables | P0 |
| Backup/restore/IR | MISSING evidence | Documentación general | Evidencia de restore test, RPO/RTO y simulacro de incidente | P0 |

## B. Bloqueos reales del release

1. Desplegar y certificar `whatsapp-send` y `whatsapp-worker` con
   `WHATSAPP_SEND_ENABLED=false` durante la instalación.
2. Aprobar y sincronizar plantillas productivas mínimas `es_MX` y `en_US`.
3. Certificar consentimiento, suppression, opt-out, presupuesto y límites de
   frecuencia de extremo a extremo.
4. Ejecutar un piloto real allowlisted: inbound, outbound, sent, delivered,
   read, reply y opt-out.
5. Cerrar autenticación y entregabilidad de email.
6. Unificar eventos críticos y probar atribución Web/PWA/Android/iOS/CRM.
7. Completar privacidad iOS, QA móvil, backups/restauración y smoke tests.

No son bloqueos: Connector/MCP, agente autónomo, todos los países, cientos de
plantillas o IA predictiva.

## C. Implementation board

### P0 — estabilidad y piloto real

- Congelar fuente de verdad de WABA y Phone Number ID ya confirmados.
- Desplegar cola/worker sin abrir el kill switch.
- Crear seis plantillas mínimas y someterlas a Meta.
- Crear landing/formulario/QR/Click-to-WhatsApp con consentimiento por finalidad.
- Certificar pipeline de números y audiencia elegible.
- Instalar rate cards vigentes, presupuesto, frequency caps y alertas.
- Hacer piloto con 5–20 destinatarios propios/consentidos y rollback preparado.
- Cerrar email, analítica, deep links, privacidad móvil y recovery/backup.

### P1 — growth operativo

- Audience Builder visual y matriz objetivo/país/idioma/plantilla.
- KPIs por campaña y experimento A/B.
- Telemetría de tokens y presupuesto para GeoBot.
- CRM 360 y Data Quality dashboard.
- Flows de registro, calificación publicitaria y handoff.

### P2 — expansión

- México primero; después pilotos pequeños en mercados aprobados por legal y
  operaciones.
- Idiomas sólo cuando exista copy revisado, soporte y landing localizada.
- Meta Business Agent productivo después de medir sandbox y costo.

### P3 — inteligencia autónoma

- Connector/MCP, herramientas mutativas, scoring predictivo y recomendaciones
  automáticas. Siempre con aprobación humana y presupuesto.

## D. Data flow map

```text
CSV / registros propios / INEGI / Overture / registros internacionales
                         |
                         v
Raw staging -> validación -> normalización -> deduplicación -> provenance
                         |
                         v
Canonical Account + Contact + Contact Point
                         |
                         v
Contactability + país + finalidad + consentimiento + suppression
                         |
             +-----------+-----------+
             |                       |
        No elegible                 Elegible
   investigación/CRM       Audience Builder + Campaign
                                     |
                       dry run + costo + aprobación
                                     |
                    Email / Ads / WhatsApp controlado
                                     |
                   statuses + replies + actividades
                                     |
                oportunidad + conversión + revenue
                                     |
                analytics y atribución server-side
```

### Política de origen de teléfonos

| Fuente | Puede entrar al CRM | Puede recibir WhatsApp automáticamente |
| --- | --- | --- |
| CSV propio | Sí, tras validación/provenance | No; requiere evidencia de opt-in para Geobooker y finalidad |
| Conversación/formulario previo de Geobooker | Sí | Sólo si el consentimiento cubre WhatsApp y la categoría del mensaje |
| WhatsApp inbound / Click-to-WhatsApp | Sí | Sí dentro de reglas vigentes; fuera de ventana exige plantilla aprobada |
| INEGI/DENUE y open data | Sí, como empresa descubierta | No; teléfono público no equivale a opt-in |
| Overture/registros globales | Sí, según licencia y jurisdicción | No; usar para research, scoring y adquisición de consentimiento |
| Proveedor/enrichment | Sí, con contrato, licencia y source URL | No sin consentimiento demostrable y reglas del país |

No existe una fuente de “números que WhatsApp entregue” para prospectar. Meta
entrega eventos de personas que interactúan con el número o campañas, no una
base pública utilizable para marketing.

## E. Event taxonomy mínima

Todos los eventos deben incluir `event_id`, versión, timestamp, ambiente,
plataforma, campaña y los IDs internos que correspondan, sin PII innecesaria.

| Etapa | Eventos canónicos |
| --- | --- |
| Consentimiento | `consent_requested`, `consent_granted`, `consent_revoked`, `contact_suppressed` |
| Campaña | `campaign_created`, `audience_evaluated`, `campaign_approved`, `campaign_started`, `campaign_paused`, `campaign_completed` |
| Mensajería | `message_queued`, `message_submitted`, `message_sent`, `message_delivered`, `message_read`, `message_failed`, `message_replied` |
| Comercial | `lead_created`, `lead_qualified`, `meeting_booked`, `proposal_sent`, `opportunity_created`, `deal_won`, `revenue_attributed` |
| IA | `ai_request_started`, `ai_request_completed`, `ai_fallback_used`, `ai_blocked`, `human_handoff_requested` |

## F. Mensajes, plantillas y Flows efectivos

### Conjunto mínimo

1. `gb_optin_confirm_es_mx` — UTILITY, confirmar solicitud explícita.
2. `gb_business_registration_help_es_mx` — UTILITY, continuar un registro solicitado.
3. `gb_ads_requested_info_es_mx` — UTILITY, responder una solicitud de Ads.
4. `gb_business_invitation_es_mx` — MARKETING, invitar con opt-in vigente.
5. `gb_ads_followup_es_mx` — MARKETING, seguimiento con frequency cap.
6. `gb_app_download_es_mx` — MARKETING, descarga con opt-in o interés registrado.
7. Los seis equivalentes `en_US` para mercados con soporte en inglés.

Una plantilla eficaz debe tener contexto reconocible, una sola promesa de valor,
un CTA, variables verificables, lenguaje local y salida clara. No debe prometer
ventas, usar urgencia engañosa ni aparentar que Geobooker conoce al destinatario
por datos comprados.

### Flows recomendados

- Registro/reclamo de negocio: nombre, categoría, ciudad y estado del registro.
- Calificación publicitaria: empresa, territorio, objetivo, rango de inversión,
  plazo, idioma y autorización de contacto.
- Handoff/reunión: asunto, idioma, zona horaria y horario preferido.

Los Flows no sustituyen consentimiento ni deben recolectar secretos o PII
excesiva.

### Experimentos y KPIs

Comparar una sola variable a la vez: propuesta, CTA o franja horaria. Medir
delivery, read, reply, opt-out, bloqueo, lead cualificado, reunión celebrada,
conversión, costo por lead cualificado y revenue. No optimizar sólo aperturas.

## G. IA y control de tokens/costo

### Aclaración

- `WHATSAPP_ACCESS_TOKEN` es una credencial: no se consume por conversación.
- Los mensajes de WhatsApp son una unidad de facturación distinta: Meta cobra
  por mensaje entregado según mercado/categoría y reglas vigentes.
- Los tokens de IA son fragmentos de texto procesados por el modelo. GeoBot PWA
  usa Gemini; Meta Business Agent puede tener medición/condiciones propias que
  deben confirmarse en el producto o contrato antes de presupuestar.

### Estado actual de GeoBot

- Server-side y sin clave en frontend.
- 8 llamadas/minuto, body máximo 32 KB, mensaje máximo 2,000 caracteres.
- Sólo ocho mensajes recientes de historial, cada uno truncado a 2,000 caracteres.
- Respuesta máxima de 350 tokens y timeout de 12 segundos.
- Fallback local para preguntas frecuentes y guardas contra secretos.
- Falta persistir `usageMetadata.promptTokenCount`,
  `candidatesTokenCount`, `totalTokenCount` y costo estimado.

### Control recomendado

1. Resolver FAQs determinísticas sin invocar IA cuando sea posible.
2. Guardar uso real que devuelve el proveedor; nunca guardar prompts sensibles.
3. Presupuestos diario y mensual con alertas al 50/80/100%.
4. Circuit breaker al alcanzar presupuesto o tasa de error.
5. Máximo de turnos por sesión y handoff cuando el usuario repite o pide humano.
6. Respuestas breves, top-k pequeño y knowledge versionado.
7. Panel separado para costo WhatsApp y costo IA.
8. En Meta Business Agent, mantener producción desactivada hasta que exista un
   reporte verificable de consumo y un límite presupuestario.

El chatbot PWA no debe eliminarse: atiende Web/PWA, reduce preguntas repetidas y
permite captar intención antes de WhatsApp. Debe compartir knowledge aprobado y
taxonomía con el agente de WhatsApp, pero no credenciales, memoria privada ni
acceso directo al CRM.

## H. Seguridad y mobile readiness

- CRM y funciones administrativas deben seguir backend-only y con mínimo
  privilegio.
- No desplegar `service_role`, Meta secrets ni Gemini key en bundles móviles.
- Revisar que materiales de firma Android estén fuera de Git y protegidos.
- Resolver `PrivacyInfo.xcprivacy` de iOS antes del release.
- Probar App Links/Universal Links en dispositivos reales.
- Mantener kill switches independientes para WhatsApp, email, paid y agentes.
- Ejecutar restore test y documentar RPO/RTO antes de declarar 2.0 estable.

## Próximo gate recomendado

No empezar por Connector/MCP ni por campañas internacionales. Empezar por:

1. plantillas productivas mínimas;
2. captura verificable de opt-in;
3. despliegue seguro de send/worker con envíos cerrados;
4. rate cards y presupuesto;
5. piloto real allowlisted en México;
6. sólo después, expansión país por país e idioma por idioma.
