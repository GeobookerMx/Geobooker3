# Seguimiento de acceso y estadísticas — 17 de noviembre de 2026

## Hallazgos contrastados

- Un HTTP 302 de `/auth/v1/authorize` confirma el inicio del flujo, no el canje de credenciales ni la creación de una sesión.
- Apple usa `com.geobooker.web.auth`; Facebook usa `3176918089184321`. Google fue confirmado funcional por el usuario.
- El intento real de Apple de las 17:29:06 UTC fue rechazado con `invalid_client`. Otro intento, a las 16:53:35 UTC, recibió HTTP 503 de Apple (`Threads not available`). Son fallos diferentes.
- Se comprobó con un control negativo que Apple devuelve `invalid_grant` para un código deliberadamente ficticio incluso si la firma del secreto es incorrecta. Esas pruebas NO validan el secreto guardado en Supabase ni un login real. Corrige la inferencia anterior de que ese resultado acreditaba la configuración.
- El secreto local renovado tiene firma ES256 verificable localmente, Services ID `com.geobooker.web.auth` y vencimiento 2027-05-16 16:41:22 UTC. Esto tampoco demuestra que Apple reconozca la asociación de su clave.
- El usuario confirmó en Apple Developer que la clave `26SZL2T9H2` está asociada a `QCN4SYVAQ4.mx.com.geobooker.app`. Falta leer el Primary App ID del Services ID `com.geobooker.web.auth` para contrastar las asociaciones. No se modificaron claves, agrupaciones, cuentas ni permisos de Apple.
- La consulta oficial posterior de estado mostró una incidencia activa en **iCloud Account & Sign In**, iniciada 17/11/2026 08:45 PST. **Sign in with Apple** figuraba sin eventos declarados. Esa incidencia no demuestra por sí sola la causa del `invalid_client`.

## Versión nativa y tienda

- La corrección de sesión está en `main` y en `codex/ios-meta-events-review`. Los cambios de web no actualizan los recursos empaquetados en una app ya instalada.
- La rama nativa prepara iOS 1.5.11 (62), mínimo iOS 15, Meta Core 19.0.1. Workflow `44133365955`, commit `6ced0b1`: archivo Release correcto; firma y carga a TestFlight **skipped**. No se envió una nueva versión a TestFlight durante este trabajo.
- El usuario tiene build 61. Sin su archivo o evidencia de procedencia no se puede certificar el código exacto que contiene. Publicar 62 requiere compilar los cambios finales y realizar pruebas en dispositivo.
- La ficha pública de Geobooker, ID `6758590506`, respondió HTTP 200 y las consultas oficiales de catálogo devolvieron la app `com.geobooker.ios` tanto en México como en EE. UU. El usuario confirmó después que sus apps reaparecieron en App Store Connect. No se estableció la causa de esa desaparición temporal.

## Cambios realizados

- Las pantallas de acceso y callback muestran mensajes concretos ante cancelación, indisponibilidad, configuración rechazada, intento vencido o fallo del canje. Los errores recibidos solo en el fragmento también se reconocen.
- El retorno nativo conserva una categoría fija de error y la pantalla de login la muestra como aviso accesible. No copia la descripción externa completa a la URL de retorno, a la pantalla ni al evento de error.
- La tabla `public.app_runtime_events` y la vista de resumen no existían en producción; su migración histórica tampoco figuraba aplicada. Se restauraron con el mismo contrato de eventos que usa el cliente existente.
- Nueva migración remota `20261117185359_restore_app_runtime_events`: RLS activo, inserción anónima sin atribuir cuentas ajenas, inserción autenticada solo con `user_id` propio o nulo, lectura para administradores y sin permisos de actualización o borrado para los clientes. La vista usa `security_invoker`.
- Estos eventos son estadísticas internas seudónimas: incluyen identificador de dispositivo, sesión y, cuando corresponde, cuenta y ubicación aproximada ya suministrada por el cliente. **No acreditan instalaciones verificadas de App Store/Play Store.** El resumen de 30 días no es una política de borrado automático.

## Validación y límites

- 17 pruebas de clasificación de errores, carreras de sesión y seguridad de recuperación: correctas.
- 18 escenarios con componentes React reales en navegador, respuestas de Supabase y plataformas simuladas: correctos; incluyen avisos en login/callback y errores en fragmento. No equivalen a pruebas OAuth reales de Apple/Facebook ni de iPhone/Android.
- ESLint de archivos modificados sin advertencias; compilación Vite correcta con avisos de recursos/tamaño preexistentes.
- Pruebas SQL transaccionales: inserción anónima válida aceptada; suplantación de otra cuenta bloqueada; lectura de no administrador bloqueada; actualización/borrado no permitidos. Los registros de prueba se revirtieron.
- La API REST reconoce la tabla restaurada y rechaza un evento inválido con `42501` (HTTP 401 para petición anónima), en lugar del anterior 404.
- Advisor de seguridad sin nuevos hallazgos para los objetos de runtime. Hay avisos previos de otros objetos; no se afirma que esta revisión resuelva toda la seguridad del proyecto.
- Pendientes: asociación Apple Services ID/clave, prueba real de Apple y Facebook, compilación final e instalación del build nuevo, ATT aceptado/rechazado y recepción sin duplicados en Meta.

Fuentes: [errores de Apple](https://developer.apple.com/documentation/technotes/tn3107-resolving-sign-in-with-apple-response-errors), [configuración Apple en Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [estado oficial de Apple](https://www.apple.com/support/systemstatus/), [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
