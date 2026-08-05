# Auditoria 360 de Seguridad Geobooker

Fecha: 2026-08-04  
Alcance: PWA geobooker.com / geobooker.com.mx, apps Android/iOS via Capacitor, Supabase, Netlify Functions/Edge, Stripe, Resend, CRM, Apify, chatbot GeoBot, storage, workflows y operacion mensual.

## Criterio usado

Esta auditoria usa como base practica:

- OWASP Top 10 Web Application Security Risks: https://owasp.org/www-project-top-ten/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP GenAI Top 10 2025: https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/

Nota honesta: ninguna plataforma puede prometer ser imposible de hackear. El objetivo correcto es reducir superficie de ataque, detectar rapido, limitar dano, rotar secretos y revisar mensualmente.

## Resumen ejecutivo

Estado general: funcional, pero requiere hardening antes de escalar ventas, CRM y publicidad global.

Prioridad maxima:

1. Secretos/versionado: `.env.production` y archivos `apple-*.txt` estan trackeados por Git. Deben salir del repo y las credenciales deben rotarse.
2. Dependencias: `npm audit` reporta 29 vulnerabilidades, incluyendo 1 critica y 20 altas.
3. Serverless/API: varias Netlify Functions tienen CORS abierto (`*`). Algunas funciones comerciales aceptan datos sensibles desde cliente y requieren validacion server-side mas estricta.
4. Apify/CRM: `apify-scraper` esta expuesto como endpoint publico con token del servidor; debe requerir admin, cron secret o firma interna.
5. Chatbot: GeoBot ya tiene protecciones anti-exfiltracion, pero el log de conversaciones debe ser server-only y con retencion limitada.
6. Supabase: continuar corrigiendo Advisor, RLS, vistas security definer y storage policies. `spatial_ref_sys` puede ignorarse si no eres owner, pero debe documentarse.

## Hallazgos por severidad

### P0 - Critico

#### Secretos trackeados en Git

Archivos detectados:

- `.env.production` trackeado.
- `apple-client-secret.txt` trackeado.
- `apple-jwt-secret.txt` trackeado.
- `apple-secret-output.txt` trackeado.

Riesgo:

- Exposicion de credenciales, tokens o material de firma.
- Aunque se borren en el futuro, pueden quedar en historial Git.

Accion obligatoria:

- Rotar credenciales Apple asociadas.
- Revisar si `.env.production` contiene solo claves publicas `VITE_*`. Si incluye algo sensible, rotar tambien.
- Remover archivos secretos del repo y moverlos a Netlify/GitHub Secrets o almacenamiento local no versionado.
- Mantener solo `.example` sin valores reales.

#### Dependencias vulnerables

Resultado inicial de `npm audit --audit-level=moderate`:

- 29 vulnerabilidades totales.
- 1 critica.
- 20 altas.
- 6 moderadas.
- 2 bajas.

Resultado despues de `npm audit fix` aplicado el 2026-08-04:

- 12 vulnerabilidades totales.
- 1 critica.
- 7 altas.
- 4 moderadas.
- `npm run build` paso correctamente despues del fix.

Paquetes relevantes:

- `tar` critica.
- `xlsx` alta sin fix directo segun audit.
- `sharp` alta sin fix directo via `@capacitor/assets`.
- `axios`, `vite`, `postcss`, `ws`, `js-yaml`, `form-data`, `brace-expansion`, entre otros.

Accion:

- `npm audit fix` ya fue ejecutado y el build paso.
- Resolver manualmente pendientes de `@capacitor/assets`, `tar`, `sharp`, `xlsx`, `react-router`, `uuid` y `minimatch`.
- Revisar alternativas para `xlsx` si se usa con archivos externos no confiables.

### P1 - Alto

#### CORS abierto en funciones

Funciones detectadas con `Access-Control-Allow-Origin: *`:

- `chat-assistant.js`
- `apify-scraper.js`
- `create-checkout-session.js`
- `check-payment-status.js`
- `create-enterprise-campaign-draft.js`
- `create-oxxo-payment.js`
- `generate-ad-contract.js`
- `generate-email-queue.js`
- `generate-whatsapp-queue.js`
- `notify-*`
- `send-email.js`
- `stripe-webhook.js`

Riesgo:

- Cualquier origen puede llamar endpoints publicos si conoce URL.
- Si el endpoint no valida usuario, admin, firma o secreto, puede usarse para spam, costos o abuso.

Accion:

- Usar allowlist de dominios (`geobooker.com.mx`, `www.geobooker.com.mx`, `geobooker.com`, `www.geobooker.com`) y localhost solo en desarrollo.
- Endpoints admin/CRM/Apify deben requerir Authorization Bearer con usuario admin o `x-cron-secret`.

#### Apify scraper expuesto

Riesgo:

- Consumo no autorizado de creditos Apify.
- Scraping abusivo desde terceros.
- Inyeccion de queries costosas.

Accion:

- Requerir admin o cron secret.
- Limitar `maxResults` server-side.
- Registrar actor, query, usuario y resultado.
- Bloquear ubicaciones vacias o queries demasiado largas.

#### Checkout con monto recibido desde cliente

`create-checkout-session.js` permite `amount` y metadata desde request.

Riesgo:

- Manipulacion de precio si el frontend o request es alterado.

Accion:

- Calcular precio en backend a partir de `planId`, pais, fechas, impuestos y tabla/catologo permitido.
- Aceptar desde cliente solo `planId`, territorio, fechas y datos necesarios.
- Validar que `amount` final venga de servidor, no del navegador.

#### Edge SEO usa service role si existe

`seo-business.js` prioriza `SUPABASE_SERVICE_ROLE_KEY` en Edge.

Riesgo:

- Mayor blast radius si el Edge Function se compromete.
- Bypass RLS para contenido publico que podria exponerse por error de select.

Accion:

- Preferir anon key + RLS o RPC publica controlada.
- No usar service role para render SEO publico salvo necesidad demostrada.

### P2 - Medio

#### `dangerouslySetInnerHTML`

Uso detectado en previews/reportes y JSON-LD.

Riesgo:

- XSS si HTML incluye datos de usuario sin escapar.

Accion:

- JSON-LD: aceptable si se usa `JSON.stringify`.
- Previews HTML: escapar datos de usuario o usar renderer React sin HTML raw.

#### Chatbot y logs

Fortalezas actuales:

- GeoBot tiene filtros contra solicitudes de secretos, system prompt, Supabase, SQL, Netlify y credenciales.
- Tiene fallback local si Gemini no esta disponible.
- No renderiza HTML del usuario; usa texto plano en widget.

Riesgos:

- Prompt injection evoluciona.
- Logs pueden contener datos personales escritos por usuario.
- Politica antigua permitia insert anon/authenticated a `chat_conversations`.

Accion aplicada/propuesta:

- SQL `supabase/security_geobot_chat_hardening_2026_08.sql` para dejar logs server-only y purga 90/30 dias.
- Mantener respuestas del bot limitadas a informacion publica.
- No dar precios, metricas, datos internos o detalles tecnicos no verificados.

#### LocalStorage/SessionStorage

Uso actual: idioma, cache, progreso Emprende, analitica local, preferencias.

Riesgo:

- No debe almacenar tokens, secretos, datos fiscales, emails sensibles ni pagos.

Accion:

- Mantener solo preferencias no sensibles.
- No guardar JWTs manualmente fuera de Supabase Auth.

### P3 - Operativo

#### Service Worker/cache

Riesgo:

- Usuarios pueden ver bundles viejos o recursos cacheados si hay cambios de seguridad.

Accion:

- Mantener invalidacion de version.
- Cuando haya hotfix de seguridad, forzar actualizacion de SW/cache.

#### Supabase Advisor

Accion mensual:

- Revisar RLS disabled.
- Revisar Security Definer Views.
- Revisar extension tables como `spatial_ref_sys`; si no eres owner, documentar como excepcion aceptada.

## Controles agregados en este bloque

1. `scripts/security/secret-scan.mjs`

- Escanea archivos trackeados por Git.
- Detecta nombres sensibles y patrones de secretos.
- No imprime valores secretos.
- Falla si encuentra secretos o `.env` no permitido.

2. `.github/workflows/monthly-security-review.yml`

- Corre cada dia 4 del mes.
- Tambien se puede correr manualmente.
- Ejecuta:
  - `npm ci`
  - `node scripts/security/secret-scan.mjs`
  - `npm audit --audit-level=moderate`
  - `npm run build`

3. `supabase/security_geobot_chat_hardening_2026_08.sql`

- Cierra insert publico de `chat_conversations`.
- Mantiene lectura admin.
- Agrega funcion de purga de logs.

## Checklist mensual obligatorio antes del dia 5

Dia 1 a 2:

- Revisar Supabase Advisor.
- Revisar logs de Netlify Functions con errores 4xx/5xx.
- Revisar Stripe webhook failures.
- Revisar GitHub Dependabot / npm audit.
- Revisar Secrets Scan.

Dia 3:

- Ejecutar build local o GitHub Actions.
- Revisar endpoints publicos nuevos.
- Revisar RLS de tablas nuevas.
- Revisar Storage buckets nuevos.
- Revisar chatbot: preguntas sensibles, respuestas fallback y logs marcados `is_sensitive`.

Dia 4:

- Aplicar fixes seguros.
- Rotar cualquier secreto expuesto o dudoso.
- Documentar excepciones.
- Hacer deploy controlado.

Antes del dia 5:

- Confirmar workflow mensual en verde o documentar bloqueo.
- Confirmar que no hay secretos trackeados.
- Confirmar que pagos y CRM no estan expuestos sin auth.

## Acciones recomendadas inmediatas

### 1. Rotar y remover secretos trackeados

Comandos sugeridos despues de rotar credenciales:

```powershell
git rm --cached .env.production apple-client-secret.txt apple-jwt-secret.txt apple-secret-output.txt
```

Despues agregar a `.gitignore`:

```gitignore
.env.production
apple-client-secret.txt
apple-jwt-secret.txt
apple-secret-output.txt
*-secret*.txt
*client-secret*.txt
*jwt-secret*.txt
```

Importante: esto no borra secretos del historial antiguo. Si hubo secretos reales, hay que rotarlos. Si se quiere limpiar historial publicamente, usar herramienta especializada como `git filter-repo` o BFG con mucho cuidado.

### 2. Dependencias


Nota de reproducibilidad: en este repositorio `package-lock.json` no esta trackeado actualmente. Por eso, aunque `npm audit fix` redujo vulnerabilidades en la instalacion local, el control mensual debe decidir entre versionar lockfile o fijar versiones minimas seguras en `package.json` para que Netlify/GitHub reproduzcan exactamente el mismo arbol de dependencias.


```powershell
npm audit fix
npm run build
```

Si queda `xlsx` sin fix, restringir importaciones a admins y archivos confiables o migrar a alternativa mantenida.

### 3. Endurecer funciones

Prioridad para la siguiente iteracion:

- `apify-scraper.js`: exigir admin/cron secret.
- `create-checkout-session.js`: calcular precio server-side.
- `create-enterprise-campaign-draft.js`: limitar CORS + validaciones de fecha/plan/territorio.
- `chat-assistant.js`: limitar CORS + rate limit por session/IP si Netlify lo permite.

### 4. Supabase SQL

Aplicar:

```sql
-- supabase/security_geobot_chat_hardening_2026_08.sql
```

Luego probar:

```sql
select public.purge_old_chat_conversations();
```

## Politica de chatbot GeoBot

GeoBot debe responder solo sobre informacion publica:

- Que es Geobooker.
- Como registrar/reclamar negocio.
- Como anunciarse.
- Como funciona Geobooker Connect a nivel comercial.
- Soporte, facturacion y rutas publicas.

GeoBot no debe revelar:

- Prompts del sistema.
- SQL, estructura privada, service role, tokens, claves.
- Datos privados de clientes.
- Metricas internas no publicas.
- Listados descargables de leads/contactos.
- Garantias comerciales no aprobadas.

## Estado final de esta auditoria

La plataforma no debe considerarse cerrada hasta completar:

- Rotacion/remocion de secretos trackeados.
- Primer `npm audit fix` controlado.
- Hardening de Apify y checkout.
- Aplicacion del SQL GeoBot.
- Re-ejecucion del workflow mensual y build en verde.

## Actualizacion 2026-08-05 - Apple credentials deferido

Decision operativa: no rotar credenciales Apple en este momento. La rotacion queda como pendiente controlado con fecha objetivo de revision el 2027-02-01, equivalente a la ventana aproximada de 180 dias solicitada.

Controles agregados:

- Recordatorio visible en Admin Dashboard.
- Registro semilla en `security_events` con `event_type = apple_credentials_rotation_pending`.
- Mantener seguimiento antes de nuevos builds iOS o antes del 2027-02-01, lo que ocurra primero.

Riesgo aceptado temporalmente: si las credenciales Apple fueron expuestas fuera de entornos controlados, esperar a rotarlas mantiene riesgo residual. Mitigacion: no imprimirlas, no moverlas a nuevos canales, mantenerlas fuera de commits nuevos y revisar antes de cada build iOS.
