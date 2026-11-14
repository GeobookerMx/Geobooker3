# Remediación de seguridad — 14 de noviembre de 2026

## Estado

Las cuatro migraciones se aplicaron a Supabase de producción el 14 de noviembre de 2026 y se verificaron sus permisos, políticas y cuentas administradoras mediante consultas de solo lectura. El frontend se publicó en `main` con el commit `7c131fd` y se comprobó que el sitio público sirve el módulo de aprobación con `admin_set_business_status`. Las aplicaciones móviles requieren reconstrucción y distribución por separado.

## Acceso de administrador

La consulta de producción encontró exactamente dos filas en `public.admin_users`: `juan.pablo.pg@hotmail.com` y `jpvaness85@gmail.com`. Ambas coinciden con cuentas de Auth y tienen correo confirmado. No había otras cuentas administradoras ni discrepancias entre `admin_users.email` y `auth.users.email`.

`20261114152945_limit_admin_accounts_20261114.sql` fija esas direcciones en la tabla, comprueba identidad y correo confirmado, impide altas o modificaciones de administradores desde el navegador, y limita la lectura del directorio a los administradores y a la propia fila. La migración se detiene si aparecen administradores adicionales antes de aplicarla. Un cambio de correo de una cuenta administradora requiere una revisión de acceso.

## Hallazgos tratados

1. `20261114153013_secure_admin_directory_and_storage_20261114.sql`: `get_users_for_admin()` comprueba administrador, pierde ejecución anónima y fija `search_path`; Storage elimina la escritura pública y las políticas de edición/borrado globales. Las nuevas subidas usan carpetas con el UUID autenticado; las existentes solo pueden borrarse por su dueño registrado. Los cinco buckets reciben límites de MIME y tamaño.
2. `20261114153039_guard_privileged_public_rpcs_20261114.sql`: las RPC privilegiadas dejan de ejecutarse por `anon`. Las RPC de administración comprueban el rol, las de usuario comparan `auth.uid()` con el usuario solicitado y `claim_business` reclama de forma atómica con token válido. Las implementaciones anteriores quedan sin permiso de ejecución para los roles de API.
3. `20261114153056_protect_business_trust_columns_20261114.sql`: quita a usuarios autenticados el permiso directo para insertar o actualizar `status`, `is_verified`, `is_featured`, `trust_score`, `verification_token` y otras columnas controladas por servidor. El alta de negocio usa valores predeterminados del servidor. Una RPC exclusiva de administrador gestiona aprobación y rechazo.
4. Frontend: rutas de Storage por usuario en anuncios, fotos, logos y evidencias; checkout empresarial pide sesión para subir un creativo; páginas de administración usan la nueva RPC de estado.
5. Dependencias: SheetJS `0.20.3` desde la distribución oficial, Capacitor Android/iOS/Core/CLI `8.6.2`, Swift Package `8.6.2`, Vite `7.3.8`, `apify-client` `2.20.0` y `@capacitor/assets` `4.0.0`. Lockfile actualizado.

## Verificación realizada

- Producción: consulta de solo lectura de cuentas administradoras, definiciones RPC, políticas, privilegios, buckets y formatos existentes antes y después de las migraciones. No se consultaron perfiles ni contenidos de archivos. Permanecen exactamente las dos cuentas autorizadas; `anon` perdió la ejecución de las siete RPC privilegiadas comprobadas, y `authenticated` perdió la escritura directa de las columnas de confianza del negocio.
- `npm run build`: correcto con advertencias anteriores de `google-libphonenumber`, CSS y tamaño de chunks.
- Diez archivos de pruebas de seguridad pasaron al ejecutarse directamente. `whatsapp-security.test.mjs` tuvo 9 fallas sobre componentes de WhatsApp no modificados en esta remediación; 39 casos de ese archivo pasaron. La ejecución conjunta mediante `node --test` falló por `spawn EPERM` del entorno.
- ESLint de archivos modificados: 0 errores; 5 advertencias existentes de dependencias de hooks.
- Auditoría npm con acceso al registro: de 42 alertas iniciales (5 críticas, 20 altas) a 14 (0 críticas, 0 altas; 12 moderadas, 2 bajas). En dependencias de producción quedan 10 (0 críticas, 0 altas).
- Las cuatro migraciones se ejecutaron correctamente en producción. La verificación de metadatos posterior confirmó las restricciones de administradores, Storage, RPC y columnas de negocio. Falta comprobar los recorridos con sesiones reales de usuario y administrador.

## Orden de despliegue y comprobaciones

1. Las cuatro migraciones se aplicaron en orden `155000`, `160000`, `161000`, `162000`.
2. El frontend se publicó con las nuevas rutas de Storage y RPC administrativas. El checkout empresarial anónimo ya no podrá subir archivos; debe iniciar sesión antes de esa etapa.
3. Ejecutar las pruebas negativas con sesiones reales como `anon`, usuario común y las dos cuentas administradoras. Verificar carga de imágenes propias, rechazo de edición/borrado ajeno y aprobación de negocios. El Security Advisor todavía registra hallazgos ajenos a esta remediación, incluidos 26 casos de RLS sin política y 72 funciones `SECURITY DEFINER` ejecutables por `anon`.
4. Reconstruir y redistribuir Android e iOS. La actualización del paquete por sí sola no protege las aplicaciones ya instaladas.

## Pendientes

- Las 14 alertas npm moderadas/bajas requieren revisión de `resend` y React Router, entre otras dependencias.
- La rotación del secreto Apple, endurecimiento de CSP y traslado de PostGIS necesitan tareas separadas. El traslado de PostGIS debe coordinarse con Supabase Support.
- Revisar historial de acceso y objetos de Storage anteriores a la corrección. La ausencia de menciones en los registros disponibles de las últimas 24 horas no prueba que no hubo accesos previos.
