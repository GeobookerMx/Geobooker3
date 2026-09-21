# GEOSCORE_PHASE2 — Schema V1 runbook

Fecha: 2026-09-21

Estado: diseño local; **no aplicado a Supabase ni a producción**

## Objetivo y límite

La migración `20260921010000_GEOSCORE_PHASE2_foundation_v1.sql` crea la base
mínima de Location Intelligence / GeoScore V1. Es aditiva: no modifica
`businesses`, no cambia RPC existentes, no importa DENUE/Censo/Overture, no
crea envíos y deja todos los feature flags desactivados y con kill switch.

No incluye todavía motor de score, ETL, H3, isócronas, PDF, enlaces públicos,
comparador, entitlements ni UI. Esos componentes deben llegar en migraciones y
cambios separados después de aprobar datos, seguridad y privacidad.

## Auditoría previa

El repositorio contiene dos implementaciones geoespaciales históricas:

- `businesses.location geography(Point,4326)` es usada por el flujo DENUE y
  `businesses_in_bounds`.
- `businesses.geog geography(Point,4326)` es usada por
  `get_businesses_nearby` y detección de duplicados.
- Existen triggers y RPC distintos para ambas columnas.
- Los feature flags actuales del cliente son variables Vite y no constituyen
  un control server-side.

Por esto la Fase 2 no elimina, renombra, rellena ni sincroniza ninguna de las
dos columnas. Crea `location_analyses.analysis_location` exclusivamente para el
pin analizado. La consolidación de `location`/`geog` necesita inventario remoto,
`EXPLAIN`, conteos de nulos, dependencias y una migración posterior dedicada.

## Objetos creados

| Objeto | Propósito | Acceso navegador |
| --- | --- | --- |
| `location_intelligence_feature_flags` | Flags server-side fail-closed | Ninguno |
| `geo_source_registry` | Versiones, licencias, cobertura y calidad | Ninguno |
| `location_score_profiles` | Pesos/configuración versionados | Ninguno |
| `location_analyses` | Solicitud y snapshot inmutable por versiones | Propietario: SELECT |
| `location_analysis_metrics` | Métricas y contribuciones explicables | Propietario: SELECT |
| `location_analysis_sources` | Provenance por análisis/métrica | Propietario: SELECT |

Las inserciones, actualizaciones y eliminaciones quedan reservadas a
`service_role`. La
aplicación debe invocarlas únicamente desde una función backend autenticada;
jamás debe enviar la service-role key al navegador o al bundle móvil.

El `DELETE` directo del propietario se excluye deliberadamente: una eliminación
debe pasar por un endpoint backend que aplique retención, registre la solicitud
y borre en cascada métricas/provenance de forma atómica. La eliminación de la
cuenta también propaga el borrado por la FK `owner_user_id -> auth.users`.

## Preflight obligatorio

No ejecutar `supabase db push` ciegamente. Antes de una preview aislada:

1. Conciliar `supabase_migrations.schema_migrations` remoto con los archivos
   locales.
2. Crear backup/restore point y confirmar responsable de rollback.
3. Confirmar que PostGIS existe y registrar el esquema donde está instalado:

   ```sql
   select e.extname, n.nspname as extension_schema, e.extversion
   from pg_extension e
   join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'postgis';
   ```

4. Inventariar sin modificar las columnas existentes:

   ```sql
   select column_name, udt_schema, udt_name, is_nullable
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'businesses'
     and column_name in ('latitude', 'longitude', 'location', 'geog')
   order by column_name;

   select
     count(*) as total,
     count(*) filter (where location is null) as location_nulls,
     count(*) filter (where geog is null) as geog_nulls
   from public.businesses;
   ```

   Si una columna no existe, ajustar sólo la consulta diagnóstica; no crearla
   como parte de esta Fase 2.

5. Confirmar que `auth.users`, `anon`, `authenticated` y `service_role` existen.
6. Aplicar primero en una rama/preview de base de datos, nunca inicialmente en
   producción.

## Validación posterior de sólo lectura

### 1. Tablas, PostGIS e índices

```sql
select to_regclass(name) as relation
from unnest(array[
  'public.location_intelligence_feature_flags',
  'public.geo_source_registry',
  'public.location_score_profiles',
  'public.location_analyses',
  'public.location_analysis_metrics',
  'public.location_analysis_sources'
]) as name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'location_analyses',
    'location_analysis_metrics',
    'location_analysis_sources',
    'location_score_profiles'
  )
order by tablename, indexname;
```

Debe existir `location_analyses_location_gist`. La migración no debe crear un
índice ni trigger adicional en `businesses`.

### 2. Flags cerrados

```sql
select feature_key, enabled, kill_switch
from public.location_intelligence_feature_flags
order by feature_key;
```

Resultado esperado: siete filas, todas con `enabled = false` y
`kill_switch = true`. Un runtime futuro sólo podrá habilitar una función cuando
`enabled AND NOT kill_switch` sea verdadero.

### 3. RLS y privilegios

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and (
    tablename like 'location_%'
    or tablename = 'geo_source_registry'
  )
order by tablename;

select
  has_table_privilege('anon', 'public.location_analyses', 'select') as anon_read,
  has_table_privilege('authenticated', 'public.location_analyses', 'insert') as user_insert,
  has_table_privilege('authenticated', 'public.location_analyses', 'update') as user_update,
  has_table_privilege('authenticated', 'public.location_analyses', 'delete') as user_delete,
  has_table_privilege('authenticated', 'public.location_analyses', 'select') as user_select,
  has_table_privilege('service_role', 'public.location_analyses', 'insert') as backend_insert;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'location_intelligence_feature_flags',
    'geo_source_registry',
    'location_score_profiles',
    'location_analyses',
    'location_analysis_metrics',
    'location_analysis_sources'
  )
order by table_name, grantee, privilege_type;
```

Esperado: `anon` sin privilegios; `authenticated` sin INSERT/UPDATE/DELETE; las tres
tablas de configuración sin privilegios de navegador; `service_role` con acceso
backend. Probar además con dos JWT reales en preview que un usuario no pueda
leer el análisis del otro y que ninguno pueda borrar directamente, ni siquiera
su propio análisis.

### 4. Invariantes

Desde backend de preview, dentro de una transacción que termine en rollback:

```sql
begin;

-- Sustituir por un auth.users.id de prueba existente.
insert into public.location_analyses (
  owner_user_id,
  business_type_key,
  analysis_location,
  idempotency_key,
  score_model_version,
  data_snapshot_version
) values (
  '00000000-0000-0000-0000-000000000000',
  'coffee_shop',
  st_setsrid(st_makepoint(-99.1332, 19.4326), 4326)::geography,
  'phase2-validation-only',
  'geoscore-v1-draft',
  'mx-validation-draft'
);

rollback;
```

No usar el UUID ilustrativo si no existe en `auth.users`. Validar por separado
que scores menores a 0 o mayores a 100, países no ISO-2 y estados no permitidos
fallen por constraint.

## Activación futura

Esta migración no autoriza activación. Antes de abrir
`LOCATION_INTELLIGENCE_ENABLED` deben existir:

- endpoint backend con autenticación, rate limit, idempotencia y validación;
- al menos un source registry aprobado, licencia verificada y snapshot fijado;
- score profile aprobado, pruebas golden y explicación por contribuciones;
- toda fuente activa con `commercial_use_allowed = true`, atribución y términos
  revisados;
- política de retención/borrado para el pin analizado;
- pruebas RLS cruzadas, carga, costos, regresión y observabilidad;
- revisión de permisos móviles y `PrivacyInfo.xcprivacy`;
- kill switch ensayado en preview.

La mutación del flag debe ser una operación backend/admin auditada. No debe
hacerse directamente desde el frontend ni mediante una variable Vite aislada.

## Rollback

El rollback es manual y destructivo para datos GeoScore, aunque no afecta las
tablas históricas de Geobooker. Sólo ejecutarlo con aprobación explícita y
después de exportar cualquier análisis que deba conservarse.

Orden recomendado:

```sql
begin;

-- Bloquear primero cualquier runtime, incluso si la eliminación se cancela.
update public.location_intelligence_feature_flags
set enabled = false,
    kill_switch = true,
    change_reason = 'GEOSCORE_PHASE2 rollback',
    updated_at = now();

drop table if exists public.location_analysis_sources;
drop table if exists public.location_analysis_metrics;
drop table if exists public.location_analyses;
drop table if exists public.location_score_profiles;
drop table if exists public.geo_source_registry;
drop table if exists public.location_intelligence_feature_flags;
drop function if exists public.geoscore_phase2_set_updated_at();

commit;
notify pgrst, 'reload schema';
```

No eliminar PostGIS, `businesses.location`, `businesses.geog`, sus índices o
sus RPC durante este rollback. Si la migración falla antes del `COMMIT`, la
transacción completa se revierte automáticamente.

## Riesgos abiertos

1. El estado real de PostGIS y de `location`/`geog` sólo puede confirmarse en
   el remoto mediante consultas read-only.
2. La precisión y retención de `analysis_location` necesitan decisión de
   privacidad antes del piloto.
3. `business_category_id` y `optional_space_id` no tienen FK deliberadamente:
   las migraciones de taxonomía/Spaces aún deben reconciliarse. El backend debe
   validarlos; una migración posterior podrá añadir FK con `NOT VALID` y luego
   validarlas.
4. Los pesos JSON requieren un validador backend y pruebas del modelo; la base
   sólo garantiza tipo objeto y aprobación para perfiles activos.
5. No existe todavía auditoría automática de cambios de configuración. El
   endpoint administrativo futuro debe escribir un audit log antes de permitir
   activación.
