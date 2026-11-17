# Login compartido de Geobooker — 17 de noviembre de 2026

## Incidente y alcance

El usuario confirmó que «Continuar con Apple» muestra una sesión y después devuelve al acceso en el iPhone (build 61), y que ocurre también en web. Se revisó el código compartido de web/PWA, iOS y Android: proveedor de sesión, login con contraseña, callbacks OAuth, rutas protegidas, reanudación, conservación de credenciales, registro y recuperación.

No se accedió a contraseñas ni a sesiones de usuarios. La consulta de solo lectura a `/auth/v1/settings` confirmó Apple, Google, Facebook y correo habilitados. Esa consulta no prueba las credenciales de Apple, su configuración privada de retorno ni un login externo completo.

## Fallo reproducido

`AuthContext` tenía una lectura inicial asíncrona y un temporizador de 8 s en web / 15 s en nativo. `SIGNED_IN` actualizaba el usuario, pero no cancelaba el temporizador ni invalidaba la lectura inicial. Un temporizador vencido o una respuesta antigua con sesión nula podía borrar una cuenta recién autenticada de la interfaz.

El ejecutor local de integración monta React, AuthProvider y las rutas reales, con respuestas Supabase simuladas. Contra el contexto anterior del commit `17cb134`, reprodujo: `web: startup timer returned an authenticated user to login`. Con el contexto corregido ese caso pasa. Es evidencia de una carrera real del código, no una reproducción autenticada contra Apple ni la prueba de que sea la única causa en el dispositivo del usuario.

## Correcciones

- Un observador de sesión suscribe eventos antes de leer la sesión y da prioridad a los eventos más recientes. Cancela el temporizador y descarta respuestas iniciales obsoletas. `INITIAL_SESSION` tardío no sobrescribe eventos vivos. `SIGNED_OUT` real sigue cerrando la sesión.
- Una falla de red o timeout se distingue de una sesión confirmada vacía. La ruta protegida ofrece reintentar en vez de enviar al usuario a bienvenida. No se confiere acceso cuando la sesión es desconocida.
- El callback OAuth usa AuthContext, sin otro listener y temporizador que compita por la navegación. Perfil, Premium y analítica no bloquean la entrada confirmada. Los errores no redirigen automáticamente en bucle.
- El acceso con contraseña actualiza el mismo contexto antes de navegar y exige una sesión real en la respuesta.
- Al volver de Apple OAuth, el ciclo nativo reanuda o pausa el auto-refresh del SDK, sin forzar rotación de tokens en cada cambio de foco.
- El callback nativo exige una sesión con usuario antes de ir al panel. Se elimina el log de la URL completa, que puede contener códigos/tokens.
- No se cambia almacenamiento, formato PKCE/implicit por plataforma, permisos de administración, RLS ni contraseñas de usuarios. La limpieza de caché existente conserva `geobooker-auth` y el verificador PKCE; no se recomienda borrar datos para tratar este incidente.

## Verificación realizada

- Nueve pruebas de carreras: éxito Apple seguido de timeout, respuesta antigua nula/rechazada, INITIAL_SESSION tardío, logout legítimo, desconexión/reconexión, sesión vacía frente a error, refresh, desmontaje y reanudación sin refresh forzado.
- Once escenarios en Chrome con componentes React reales y servidor simulado: ruta protegida, callback Apple y contraseña en web, iOS y Android simulados; callbacks Google y Facebook en web. Incluyen login, panel persistente frente a respuestas tardías, logout y limpieza de listeners.
- Cinco pruebas existentes de recuperación/seguridad y ocho de conversiones/temporada pasan: 22 pruebas Node en total.
- Build Vite de producción pasa. ESLint dirigido pasa excluyendo únicamente la regla de hot-reload `react-refresh/only-export-components`, que ya señalaba la exportación histórica de `useAuth` junto al proveedor.
- Los escenarios en Chrome no son ejecuciones de WebKit/iPhone, Android ni una PWA instalada. El retorno real de Apple, las restricciones del navegador y los tokens del proveedor requieren comprobación externa.

Comandos reproducibles en Windows con Chrome/Edge:

```powershell
node scripts/tests/auth-session-observer.test.mjs
node scripts/tests/auth-session-browser-check.mjs --baseline --baseline-ref=17cb134
node scripts/tests/auth-session-browser-check.mjs
```

El comando baseline debe fallar con el mensaje del temporizador; los otros deben pasar. No usa cuentas reales. Las pruebas de carreras quedan también en CI.

## Validación externa pendiente

| Flujo | Comprobación pendiente |
| --- | --- |
| Apple web/Safari | Completar proveedor, entrar, esperar más de 15 s, recargar y comprobar el panel sin rebote |
| PWA instalada | Repetir Apple, cerrar/reabrir, comprobar misma cuenta y retorno al contenedor correcto |
| iPhone/TestFlight | Instalar la siguiente compilación, probar Apple con email compartido/oculto, reapertura, fondo/primer plano y red lenta |
| Android | Compilar/sincronizar, probar Google/Apple disponible, contraseña, callback duplicado y reanudación |
| Registro/confirmación | Cuenta nueva con correo confirmado en web y nativo; sin falso login antes de confirmar |
| Recuperación | Enlace real, cambio de contraseña y cierre local de sesión intencional; no se envían correos durante esta auditoría |
| SDK Meta | Comprobar eventos después de estabilizar el acceso; ATT rechazado conserva funcionalidad de login |

La sesión debe invalidarse ante un cierre real, revocación o refresh rechazado de forma definitiva. La corrección no conserva credenciales inválidas ni sustituye la autorización del servidor.

## Entrega

El arreglo compartido se entrega separado de los cambios iOS/Meta/temporada para permitir su publicación web sin adelantar una integración nativa no verificada. El usuario confirmó build 61 subido; la siguiente compilación iOS preparada es `1.5.11 (62)`. El binario 61 no cambia con un despliegue web.

Referencias: [Supabase auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [auto-refresh](https://supabase.com/docs/reference/javascript/auth-startautorefresh), [native deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
