# Geobooker: proveedores de acceso y exploración con cuenta

## Diagnóstico confirmado

- El usuario probó Google en la web y confirmó que entra y mantiene la sesión. Apple continuó fallando antes de crearla.
- Los logs de Supabase mostraron `invalid_client` durante el intercambio con Apple. Los dos JWT locales anteriores vencieron el 20/21 de junio de 2026. El proveedor público de autorización usa el Services ID `com.geobooker.web.auth`, no el valor alternativo `mx.com.geobooker.auth` de un generador antiguo.
- Se generó un Client Secret nuevo con la clave privada local de Geobooker, se verificó su firma y sus claims sin imprimirlo, y se guardó en un archivo excluido de Git. Vigencia: 17 de noviembre de 2026 a 16 de mayo de 2027. El usuario confirmó haberlo guardado en Supabase. La clave `.p8` no necesita recrearse cada seis meses; se renueva el JWT de cliente.
- La prueba controlada de Supabase con un estado válido y un código deliberadamente ficticio pasó de rechazo de cliente a `invalid_grant`, resultado esperado para ese código. No creó un usuario ni una sesión. No equivale a una prueba real de Apple exitosa.
- El intento real del 17 de noviembre a las 16:53:35 UTC mostró `oauth2: cannot fetch token: 503 Service Unavailable / Threads not available`. Es un fallo del intercambio con el proveedor, no evidencia de un logout posterior de React. No se encontró una incidencia general publicada en los estados públicos consultados. No se afirma que la integración Apple esté resuelta.
- La ruta pública `/auth/callback` con parámetros de error devuelve HTTP 200 y el shell de la aplicación en la comprobación actual. El 404 compartido por el usuario no se reprodujo en esa consulta.
- Facebook está configurado en Supabase con el Client ID literal `Geobooker Plataform`. Debe ser un App ID numérico válido y su App Secret correspondiente. El App ID de Geobooker contrastado en la revisión es `3176918089184321`; falta corregirlo y probar la autorización real. El token cliente del SDK de eventos no sustituye al App Secret de Facebook Login.

No se guardan en este informe valores de secretos, contraseñas, códigos OAuth o datos personales de cuentas. Las correcciones de proveedor se realizan en Supabase y no requieren recompilar por sí solas.

## Error de analítica separado

El código enviaba `metadata` a `public.user_sessions`, pero la consulta de `information_schema` confirmó que esa columna no existe. La tabla ya dispone de `attribution_snapshot` JSONB. Se corrigió el payload para usar `attribution_snapshot.auth_funnel`, conservando `session_type`, método, fuente y deduplicación de vistas. El primer intento deja de provocar el 400 por columna inexistente y de perder los detalles al usar un fallback reducido. No se cambia el esquema, RLS ni las contraseñas.

Una prueba funcional ejecuta el servicio real con inserciones simuladas contra la lista de columnas inspeccionada. Comprueba un solo insert por evento, vistas deduplicadas y conservación del método Google. No se insertan eventos ficticios en producción.

## Acceso obligatorio solicitado

Preparado para `geobooker.com.mx`, `www.geobooker.com.mx` y Android nativo. La web global y el comportamiento nativo iOS no se cambian en esta entrega de acceso obligatorio.

Las vistas previas y el dominio Netlify del proyecto `geobooker3` muestran también el aviso para poder revisarlo antes de activarlo en el dominio mexicano. No se aplica a dominios de otros proyectos.

- Mapa, búsquedas, categorías, ciudades, perfiles, GeoScore, Emprende y Biblioteca muestran un aviso de acceso obligatorio antes de montar la herramienta.
- Registro, login, retorno OAuth, recuperación, privacidad, términos, ayuda y páginas de presentación permanecen accesibles. No hay botón de cerrar el aviso para seguir explorando como invitado.
- Una sesión anónima de Supabase no cumple el requisito. Una cuenta autenticada real permite entrar; cerrar sesión vuelve a mostrar el aviso.
- Se conserva el destino solicitado durante un máximo de 30 minutos y se consume tras el acceso. Se rechazan redirecciones externas, protocolos, barras codificadas peligrosas y rutas de autenticación que producirían bucles.
- El acceso por correo, Google, Facebook y Apple vuelve al destino interno cuando el proveedor haya establecido una sesión. El código no crea sesiones falsas para suplir errores de proveedor.
- El asistente no queda disponible para visitantes sin cuenta en los canales donde se exige el acceso.
- Es una barrera de experiencia de usuario, no convierte los datos públicos del directorio en datos privados ni sustituye RLS. No se introduce ninguna excepción de autenticación especial para bots.
- La barrera puede reducir exploración/conversión inicial y afectar la indexación de contenido que antes se podía explorar. No se promete que aumente usuarios activos, instalaciones o ventas.

La entrega del aviso queda en revisión, sin activarlo en producción mientras Apple siga fallando y Facebook tenga un Client ID incorrecto. La corrección independiente de analítica puede publicarse sin activar la barrera.

## Verificación

- 18 pruebas Node de sesión/recuperación/política de acceso y 1 prueba de contrato de analítica pasan.
- 14 escenarios React en Chrome pasan, con respuestas de Supabase simuladas: sesiones, callbacks, contraseña, retorno a negocio y bloqueo/restauración de exploración para web/Android. No son pruebas de una PWA instalada o de proveedores externos reales.
- ESLint dirigido y build Vite pasan en la rama preparada.
- Pendientes: confirmar Apple real con secreto renovado, corregir y probar Facebook, verificar PWA instalada y compilar/probar Android. El build iOS 61 instalado no recibe cambios JavaScript por un despliegue web; la recuperación de sesión compartida necesita el build 62 preparado.

## Métricas que deben mantenerse separadas

1. Cuentas nuevas: nuevas identidades reales de la plataforma, no cada login.
2. Inicios de sesión: accesos exitosos, segmentados por proveedor y plataforma.
3. Usuarios activos: usuarios distintos por periodo y retención; no suma de eventos.
4. Instalaciones: App Store Connect/Google Play Console y atribución móvil validada. Un login o instalación de PWA no acredita una instalación de App Store/Play Store.

Referencias: [Apple OAuth en Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [estado público de Apple](https://www.apple.com/support/systemstatus/), [estado público de Supabase](https://status.supabase.com/).
