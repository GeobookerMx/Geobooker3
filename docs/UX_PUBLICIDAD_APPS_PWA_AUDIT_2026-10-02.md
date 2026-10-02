# Auditoria UX Apps/PWA y Publicidad V1

Fecha: 2026-10-02

## Lectura del documento

El archivo `Prompt_Maestro_Auditoria_UX_Publicidad_Apps_PWA_Geobooker.docx` se uso como referencia de producto, no como instrucciones ejecutables automaticas.

La logica central es correcta:

- Apps iOS/Android: descubrir negocios, comparar y actuar rapido.
- PWA publica: SEO, discovery, descarga, registro de negocio, Ads/Enterprise/Global.
- PWA Business/Admin: negocio, campanas, CRM, facturacion, auditoria, reportes.
- Publicidad V1: un solo formato contextual, distinguible y no invasivo.

## Estado de preparacion

`GEOBOOKER_UX_360_READINESS = NOT_READY`

No por bloqueo tecnico, sino porque aun falta la auditoria completa de rutas, claims de tiendas, eventos, privacidad, accesibilidad, screenshots y metricas reales de uso. Para builds inmediatos, si es valido aplicar quick wins reversibles y evitar cambios destructivos.

## Mejoras aplicadas para el siguiente build

- Se agregaron feature flags en `src/config/featureFlags.js`:
  - `adsSponsoredCardV1`: activo por defecto.
  - `adsLegacyDisplayFormats`: apagado por defecto.
- En `src/pages/HomePage.jsx` la experiencia principal queda con un solo slot `SponsoredResultCard`, equivalente a la direccion `GEO_SPONSORED_CARD_V1`.
- En apps nativas iOS/Android se ocultan por defecto formatos legacy/intrusivos:
  - `HeroBanner`
  - `CarouselAd`
  - `StickyBanner`
  - `InterstitialAd`
- No se eliminaron componentes ni datos; todo queda reversible via `VITE_ADS_LEGACY_DISPLAY_FORMATS=true`.
- Se limpio `src/components/pwa/DownloadAppModal.jsx`:
  - texto sin mojibake;
  - sin prometer "premium sin anuncios";
  - tracking de intencion de instalacion;
  - instrucciones iOS mas claras.

## Recomendaciones para lanzar iOS/Android

1. Mantener la app nativa enfocada en: buscar, mapa, ficha, contactar, guardar y cuenta.
2. No mostrar CRM, dashboards, Ads Manager, facturacion ni admin en navegacion primaria movil.
3. Pedir ubicacion solo con contexto y conservar busqueda por ciudad sin permiso.
4. Mantener maximo un anuncio visible por pantalla.
5. No usar interstitials, popups, sticky ads ni autoplay en apps de consumo.
6. Mover configuracion comercial, campanas, creativos, pagos OXXO/Stripe, reportes y auditoria a PWA/Admin.
7. Actualizar screenshots de tiendas con busqueda, mapa, ficha y contacto, no con paneles administrativos.
8. Revisar privacidad de tiendas contra SDKs reales: Supabase, GA4, Clarity, Meta, Maps y pagos.
9. Probar mapa en Android con API key, restricciones SHA-1/SHA-256, package `com.geobooker.app` y billing activo en Google Cloud.
10. Validar accesibilidad basica antes de subir: contraste, tamanos tactiles, labels, TalkBack/VoiceOver y texto grande.

## Fases recomendadas

### Fase 0: auditoria completa

Inventario de rutas, modales, tabs, CTAs, APIs, tablas, buckets, eventos y claims publicos. Salida: matriz `KEEP / SIMPLIFY / MERGE / MOVE_TO_PWA / CONTEXTUAL / HIDE_FLAG / REMOVE`.

### Fase 1: quick wins para builds

Aplicar flags, retirar friccion visible, limpiar copys, asegurar icons/manifest, validar mapas, deep links y permisos.

### Fase 2: experiencia movil

Home/Cerca de ti, Explorar lista+mapa, Guardados o Cuenta segun metrica, ficha de negocio y handoff a PWA para negocio/ads.

### Fase 3: PWA por roles

Publica, Mi negocio, Crecimiento, Ventas y Administracion. Cada modulo visible solo por rol/permiso.

### Fase 4: Ads V1

Decision server-side, frequency caps, tracking de impresion visible, click, hide/report, politicas RLS, buckets privados/aprobados y reporte al anunciante.

## Pendientes antes de store release

- Ejecutar build web y sync de Capacitor.
- Probar Android Studio con mapa real.
- Probar iOS en Mac/Xcode.
- Confirmar que la version de tienda no promete funciones no visibles o no estables.
- Si se requiere Ads V1 completo, cerrar primero tablas/API/decision server-side; lo aplicado hoy es una simplificacion de UX, no un ad server completo.
