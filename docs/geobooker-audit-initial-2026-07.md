# Geobooker - Auditoria Inicial 2026-07

## Objetivo

Traducir el "prompt maestro" de rendimiento, SEO tecnico y seguridad 360 a un plan ejecutable y compatible con el estado real de Geobooker.

## Resumen Ejecutivo

El prompt maestro esta bien orientado, pero no debe ejecutarse literalmente. Geobooker ya cuenta con varias capas de optimizacion y SEO que el prompt asume inexistentes:

- Lazy loading por rutas y modulos pesados
- SEO component con metas, canonical y JSON-LD
- robots.txt y sitemap
- Edge SEO para perfiles publicos
- ATT para iOS y consentimiento diferenciado
- Chatbot lazy y fallback controlado
- RLS en una porcion importante del esquema

La estrategia correcta no es "rehacer todo", sino:

1. Auditar carga real de Home y rutas publicas
2. Endurecer backend y funciones sensibles
3. Normalizar RLS/vistas publicas
4. Mejorar HTML inicial e indexabilidad de rutas clave
5. Hacer una fase de performance medible y reversible

---

## 1. Hallazgos Confirmados

### 1.1 Frontend y arquitectura publica

- La app usa React + Vite + JSX. El prompt menciona TypeScript, pero el proyecto actual no esta centrado en TS.
- El router ya usa `React.lazy` y `Suspense` en una gran cantidad de rutas:
  - admin
  - auth
  - dashboard
  - publicidad
  - enterprise
  - community
- El chatbot ya esta lazy loaded desde `src/App.jsx`.
- El consentimiento ATT para iOS ya esta integrado en `src/App.jsx`.

### 1.2 SEO ya existente

- Existe `src/components/SEO.jsx` con:
  - title
  - description
  - robots
  - business schema
  - breadcrumbs
  - organization schema
  - website schema
  - custom structured data
- Hay rutas publicas con SEO ya trabajado:
  - Home
  - FAQ
  - Download
  - Advertise
  - Category pages
  - City pages
  - Business profile pages
  - Enterprise/B2B pages
- Existe `public/robots.txt`.
- Existe sitemap dinamico mediante `netlify/functions/sitemap-generator.js`.
- Existe edge function SEO para `/business/*`.

### 1.3 Performance ya iniciado

- Web vitals ya estan integrados con `src/services/vitalsService.js`.
- El mapa principal en Home ya esta lazy loaded:
  - `const BusinessMap = lazy(() => import('../components/BusinessMap'));`
- Aun asi, Home sigue siendo una pagina de alto riesgo por:
  - consultas de Supabase
  - enrichment de awards
  - publicidad
  - recomendaciones
  - buscador
  - fallback de seed Michelin
  - posible costo de Google Places

### 1.4 Seguridad y backend

- Hay gran cantidad de scripts SQL para RLS y hardening.
- Siguen existiendo superficies sensibles que deben auditarse de forma unificada:
  - Stripe webhook
  - create-checkout-session
  - create-oxxo-payment
  - cron auth y queues
  - funciones de correo
  - funciones de scraping y CRM
- `netlify.toml` ya tiene cache y algunos headers, pero todavia no representa una politica de seguridad completa.

---

## 2. Riesgos Reales Prioritarios

### Riesgo A - Home publica aun demasiado acoplada

La Home no esta "en cero", pero sigue cargando demasiada logica:

- awards
- anuncios
- recomendaciones
- mapa
- geolocalizacion
- search
- seed local

Esto puede mantener alto:

- LCP
- TBT
- payload inicial
- trabajo del main thread

### Riesgo B - SEO publico principalmente client-side

Aunque existe SEO component y edge injection, gran parte del SEO sigue dependiendo del frontend renderizado en cliente.

Eso significa que aun hay trabajo pendiente en:

- HTML inicial util
- consistencia indexable de rutas publicas
- prerender selectivo
- control de canonicals y noindex en rutas funcionales

### Riesgo C - Hardening disperso

Hay muchos scripts SQL y fixes historicos. El riesgo no es falta de trabajo, sino dispersion:

- RLS no uniformado
- vistas creadas con `SECURITY DEFINER`
- politicas historicas posiblemente redundantes
- funciones sensibles sin matriz centralizada

### Riesgo D - Headers y CSP aun incompletos

`netlify.toml` ya tiene:

- cache-control
- x-frame-options parcial
- x-content-type-options parcial
- referrer-policy parcial

Pero falta una estrategia integral para:

- headers globales
- permissions-policy
- CSP report-only
- separacion fina entre HTML publico, assets y funciones

---

## 3. Lo que NO conviene hacer aun

- No migrar todo a Next.js o Astro sin prueba piloto.
- No cambiar masivamente login/OAuth mientras iOS y Android estan en fase activa.
- No activar CSP estricta de golpe.
- No rehacer todo el SEO como si no existiera.
- No intentar "verde absoluto" del Advisor si obliga a tocar tablas de extension como `spatial_ref_sys`.
- No mezclar fase de performance con cambios comerciales o fiscales no relacionados.

---

## 4. Plan Recomendado por Fases

## Fase 1 - Auditoria accionable

### Objetivo

Obtener evidencia real antes de tocar arquitectura.

### Acciones

1. Bundle audit con visualizador
2. Identificar dependencias pesadas:
   - `@react-google-maps/api`
   - `@stripe/stripe-js`
   - `recharts`
   - `xlsx`
   - `lucide-react`
3. Revisar Home:
   - imports
   - queries
   - enrichment
   - modulos por arriba del fold
4. Inventario de funciones Netlify sensibles
5. Matriz RLS real por tablas expuestas
6. Inventario de vistas `security definer`

## Fase 2 - Quick wins seguros

### Objetivo

Reducir riesgo y peso sin romper flujos.

### Acciones

1. Corregir vistas a `security_invoker`
2. Consolidar headers base en Netlify
3. Revisar preload/preconnect innecesarios
4. Aplazar mas componentes no criticos en Home
5. Confirmar rutas funcionales con `noindex`
6. Normalizar sitemap y canonicals en rutas publicas clave

## Fase 3 - Hardening backend

### Objetivo

Blindar backend y automatizaciones.

### Acciones

1. Auditar Stripe webhook
2. Auditar `create-checkout-session`
3. Auditar `create-oxxo-payment`
4. Validar `CRON_SECRET` y comparacion segura
5. Revisar funciones de queue/email
6. Revisar exposicion de roles admin en RLS
7. Revisar storage buckets y politicas

## Fase 4 - SEO renderizable

### Objetivo

Mejorar indexabilidad real sin migracion total.

### Acciones

1. Probar prerender/edge para:
   - `/`
   - una ciudad piloto
   - un negocio piloto
2. Revisar HTML inicial de Home
3. Separar mejor rutas publicas vs funcionales
4. Confirmar reglas `index/noindex`

## Fase 5 - Performance estructural

### Objetivo

Bajar costo real del frontend publico.

### Acciones

1. Deferral mas agresivo de mapa y Places
2. Ajustes de imagenes y payload
3. Mejorar LCP y above-the-fold
4. Reducir trabajo de main thread
5. Revisar listas largas, renders y recomputaciones

---

## 5. Acciones Concretas que si puedo ejecutar ahora

### Alta prioridad

- Auditoria de bundle y dependencias pesadas
- Revision de `netlify.toml` y headers
- Revisión de funciones sensibles de pagos y cron
- Matriz inicial de tablas publicas/RLS
- Limpieza de vistas `security definer`

### Prioridad media

- Reorganizar Home para recortar carga critica
- Revisar robots/sitemap/canonical/noindex
- Preparar piloto de prerender publico

### Prioridad posterior

- CSP report-only
- runbook de incidentes
- dependabot / politicas de branch / auditoria avanzada de repositorio

---

## 6. Estado local al momento del reporte

Cambios locales detectados:

- `android/app/build.gradle`
- `supabase/fix_advisor_public_rls_2026_07.sql`

Antes de cambios grandes conviene no mezclar hardening web con el ajuste de version Android.

---

## 7. Recomendacion Final

El prompt maestro es util como marco de auditoria, pero Geobooker necesita una ejecucion por fases, no una refactorizacion total.

La mejor siguiente secuencia para este repo es:

1. Bundle audit
2. Home audit
3. Netlify headers/security review
4. Stripe/cron/functions audit
5. RLS matrix + security_invoker cleanup
6. Piloto SEO renderizable

Con eso se mejora rendimiento, SEO y seguridad sin estropear Android, iOS, CRM, Ads ni la operacion comercial actual.
