# Auditoría de seguridad de GeoBooker — 14 de noviembre de 2026

## Alcance y método

Revisión de código local, dependencias, configuración de Netlify, funciones de Supabase y metadatos de la base de producción `Geobooker Plataform`. Consultas a producción solo de lectura: privilegios, definiciones de funciones, políticas RLS, buckets, estadísticas y Security Advisor. No se extrajeron datos personales ni valores de credenciales, ni se ejecutaron llamadas de explotación o cambios de esquema.

**Resultado:** hay fallas críticas confirmadas. El aviso `public.spatial_ref_sys` es real, pero su impacto principal es disponibilidad/integridad de consultas geográficas, no fuga de información personal. Los hallazgos de exposición de perfiles y Storage tienen prioridad mayor.

## Hallazgos priorizados

| ID | Prioridad | Hallazgo y evidencia | Acción |
| --- | --- | --- | --- |
| G01 | Crítica | `public.get_users_for_admin()` es `SECURITY DEFINER`, permite `EXECUTE` a `anon` y `authenticated`, no comprueba `auth.uid()` ni pertenencia a administradores y devuelve nombres, correos y estado premium de `public.user_profiles`. Hay 53 perfiles. La definición desplegada coincide con `supabase/fix_admin_analytics_schema.sql:41-52`; una definición anterior en `supabase/get_users_for_admin.sql` sí tenía un control de administrador. | Revocar `EXECUTE` a `PUBLIC` y `anon` de inmediato; volver a crear la función con verificación de administrador dentro del cuerpo, `search_path` fijo y concesión solo a `authenticated`. Verificar como `anon`, usuario común y administrador. Revisar registros de acceso históricos. |
| G02 | Crítica | En `storage.objects`, la política activa `Public full access ad-creatives` es `FOR ALL TO public` sin comprobación de dueño. `anon` tiene privilegios de `INSERT`, `UPDATE` y `DELETE`; existen 44 objetos en `ad-creatives`. También hay políticas de borrado/edición de `business-assets`, `business-images`, `business images` y `recommendations` para cualquier usuario autenticado, sin dueño. Origen en `supabase/fix_critico_rls.sql:42` y `supabase/fix_all_storage_buckets.sql:39-57`. | Quitar políticas globales de escritura. Permitir lectura pública solo donde corresponda; escritura mediante rutas por usuario o campaña comprobada en RLS, límites de tamaño y MIME. Probar acceso a objetos propios y ajenos. Evitar volver a ejecutar scripts antiguos que borran políticas en bloque. |
| G03 | Alta | Propietarios de `public.businesses` pueden actualizar columnas `status`, `is_verified`, `is_featured`, `trust_score` y `verification_token`: la política de `UPDATE` comprueba el `owner_id`, pero no limita las columnas, y `authenticated` tiene privilegio de `UPDATE` sobre ellas. Un propietario podría alterar señales de aprobación/confianza de su propio negocio. | Revocar actualización de columnas gestionadas por el servidor; conceder solo campos editables por el propietario o usar un RPC controlado. Añadir verificación de transiciones de estado y pruebas de privilegios por columna. |
| G04 | Alta | Otras funciones `SECURITY DEFINER` en `public` aceptan `anon` sin autenticar ni comprobar autorización: `add_blocked_word`, `create_makegood`, `generate_daily_whatsapp_queue`, `mark_whatsapp_sent`, `redeem_points_for_ad` y `claim_business`. La última recibe `p_user_id` del llamante. El Security Advisor enumera 79 funciones de este tipo ejecutables por `anon`; no todas son vulnerables, pero estas requieren revisión prioritaria. | Inventariar cada RPC y revocar `EXECUTE` por defecto; conceder solo el rol necesario. En funciones legítimas, verificar `auth.uid()`, propiedad y rol dentro del cuerpo. Separar tareas de cron/servicio en esquema no expuesto. |
| G05 | Alta | `xlsx@0.18.5` está instalado y se usa para leer archivos CSV/XLS/XLSX aportados a las pantallas de administración (`src/pages/admin/BulkImport.jsx:59,225`; `src/pages/admin/UnifiedCRM.jsx:475`). GitHub clasifica esta versión como afectada por contaminación de prototipos y ReDoS; la versión corregida no está en npm. `npm audit` devolvió 0 hallazgos, por lo que el control automático actual no detectó este riesgo. | Sustituir el parser o usar una distribución corregida y verificada; mientras tanto limitar tamaño/tiempo, aislar el procesamiento y restringir archivos no confiables. |
| G06 | Media | `public.spatial_ref_sys` no tiene RLS; `anon` puede insertar, modificar y borrar definiciones de coordenadas. Es tabla de referencia de PostGIS, sin datos de clientes. PostGIS está instalado en `public` y pertenece a `supabase_admin`. Las estadísticas muestran 0 filas actualizadas y 0 borradas desde la ventana disponible, lo que no descarta cambios anteriores o inserciones. | Pedir a Supabase Support traslado transaccional de PostGIS a `extensions`. **No ejecutar** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `REVOKE`, ni `DROP EXTENSION ... CASCADE` en producción: los dos primeros no resuelven la propiedad y el último pone en riesgo columnas y dependencias. Preparar las funciones indicadas abajo. |
| G07 | Media | La CSP de `netlify.toml:33` permite `unsafe-inline` y `unsafe-eval`; eso reduce la protección ante XSS. Sí hay HSTS, `frame-ancestors 'none'` y `nosniff`. | Migrar scripts propios a nonce/hash y retirar `unsafe-eval` tras probar Google Maps, Stripe y analítica. |
| G08 | Media | Los archivos Apple JWT fueron versionados en el historial de Git y siguen presentes localmente. `docs/APPLE_SECRET_ROTATION.md` documenta la exposición histórica y rotación pendiente. No se imprimieron valores. `.env.local` contiene credenciales locales y está ignorado; `.env.production` está versionado y contiene solo variables `VITE_*` públicas. | Confirmar rotación/revocación del secreto Apple en Apple Developer y Supabase Auth; comprobar que los archivos locales se eliminen después. Revisar accesos al historial del repositorio. |
| G09 | Baja/media | Security Advisor: 130 funciones con `search_path` mutable, 26 tablas RLS sin políticas (muchas son internas y pueden ser intencionales), protección contra contraseñas filtradas desactivada. El único objeto de `public` sin RLS es `spatial_ref_sys` entre 137 tablas ordinarias. | Priorizar funciones `SECURITY DEFINER` realmente expuestas, activar protección contra contraseñas comprometidas y documentar tablas internas sin políticas. |

## Caso `spatial_ref_sys`: diagnóstico y resolución

La alerta del panel es correcta. Las definiciones SRID son públicas por naturaleza, pero los permisos de escritura anónimos permiten alterar coordenadas o impedir cálculos geográficos. No observé modificaciones o borrados en las estadísticas disponibles; esto no prueba ausencia histórica de abuso.

Hay columnas PostGIS en `public.business_candidates.location`, `public.businesses.location`, `public.businesses.geog` y `public.location_analyses.analysis_location`, además de vistas dependientes. La [guía oficial de Supabase](https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema-f9d408) indica pedir a Support el traslado sin reconstruir la extensión cuando hay columnas PostGIS. Supabase advierte que `postgres` no es dueño de estos objetos y que un `REVOKE` puede parecer exitoso sin cambiar nada.

Antes del traslado, las funciones `public.geoscore_geobooker_business_metrics_preview(...)` y `public.geoscore_calculate_location_score(...)` tienen `search_path=pg_catalog, public` y usan PostGIS. Deben revisarse y añadir `extensions` al final del `search_path`; después se prueban GeoScore, mapas y consultas espaciales. Conviene revisar llamadas directas desde Data API a funciones PostGIS y coordinar la reconexión de clientes después del traslado.

Preparación SQL para revisión y aplicación antes del traslado por Support (mantiene el orden del `search_path` actual):

```sql
ALTER FUNCTION public.geoscore_geobooker_business_metrics_preview(
  double precision, double precision, text, text, integer
) SET search_path = pg_catalog, public, extensions;

ALTER FUNCTION public.geoscore_calculate_location_score(
  text, double precision, double precision, text, integer, boolean, uuid
) SET search_path = pg_catalog, public, extensions;
```

Después del traslado: confirmar `pg_extension.extnamespace = 'extensions'`, ejecutar GeoScore y búsquedas geográficas, comprobar que las siete columnas/vistas PostGIS siguen disponibles y volver a correr Security Advisor. Este SQL de preparación no se ha aplicado.

**Solicitud lista para Supabase Support:**

> Proyecto: Geobooker Plataform. PostGIS está instalado en `public` y es propiedad de `supabase_admin`. Security Advisor reporta `public.spatial_ref_sys` sin RLS; confirmamos `anon` con privilegios de escritura. Hay columnas `geography` en `business_candidates`, `businesses` y `location_analyses`, por lo que necesitamos mover PostGIS a `extensions` sin eliminar/recrear la extensión ni perder columnas, datos o índices. Solicitamos que el traslado sea transaccional y nos indiquen ventana, requisitos de reconexión y validaciones posteriores. Prepararemos dos funciones GeoScore con `search_path` explícito que incluya `extensions`.

No se envió esta solicitud a Support ni se modificó producción.

## Controles comprobados y límites

- Los flujos de Checkout que se revisaron calculan importes en servidor, validan identidad para Premium y rechazan `priceId` proporcionado por el cliente. El webhook Stripe usa `constructEvent` con firma. Esto no es una prueba completa del flujo de pagos extremo a extremo.
- El repositorio contiene HSTS, cabeceras contra clickjacking y limitación de tasa en algunas funciones. No se verificó que cada respuesta publicada entregue esas cabeceras ni que todas las rutas estén cubiertas.
- `npm audit` local devolvió **0** vulnerabilidades, pese al aviso externo confirmado de `xlsx`; no debe interpretarse como plataforma segura.
- No se hizo pentest activo, pruebas de fuerza bruta, lectura de datos personales, pruebas de mutación ni comprobación de despliegues Netlify. El estado real de producción de frontend/funciones puede diferir del árbol local con cambios sin confirmar.
- La lista de 79 RPC `SECURITY DEFINER` ejecutables por `anon` es una señal de revisión, no 79 explotaciones confirmadas.

## Orden de remediación

1. **Hoy:** cerrar `get_users_for_admin` y escritura/borrado abiertos de Storage; revisar logs de acceso y objetos afectados.
2. **Siguiente:** bloquear edición de estado/verificación de negocios y cerrar RPC privilegiadas no autenticadas; validar roles con pruebas negativas.
3. Sustituir `xlsx`; rotar el secreto Apple si continúa vigente; fortalecer CSP y controles de Auth.
4. Preparar funciones GeoScore y gestionar con Supabase Support el traslado de PostGIS a `extensions`.

## Referencias

- [Supabase: Security Advisor y PostGIS en `public`](https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema-f9d408)
- [Supabase: seguridad RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [GHSA-4r6h-8v6p-xvw6: SheetJS contaminación de prototipos](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)
- [GHSA-5pgg-2g8v-p4x9: SheetJS ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
