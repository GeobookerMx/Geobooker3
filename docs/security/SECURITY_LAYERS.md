# Capas de seguridad de Geobooker

## Implementado en este cambio

- `Security guard` comprueba archivos versionados y 13 pruebas de seguridad en los pushes de main, pull requests y cada lunes a las 12:00 UTC. No requiere secretos de producción.
- El escáner detecta claves administrativas de Supabase y secretos Apple con formato JWT, claves `sb_secret_`, archivos de firma y bloques de claves privadas. Informa rutas y motivos sin imprimir valores. La configuración pública del cliente sigue permitida.
- Los tests comprueban autorización administrativa en servidor y denegación de solicitudes cuando falla el control de abuso. Son pruebas con clientes simulados, sin correos ni mensajes reales.
- El archivo de firma Android deja de versionarse; permanece en el almacenamiento local y se ignoran futuros archivos de firma. Eliminarlo del árbol actual no borra el historial ni reemplaza claves.
- El comando de mantenimiento de la cuenta de demostración recibe credenciales e identificadores desde un entorno privado, exige una contraseña explícita y rechaza cuentas administrativas. No se ejecuta durante la compilación ni se ha utilizado en esta revisión.

Una comprobación de CI fallida solo impide una fusión si GitHub exige ese estado mediante reglas del repositorio. Configurar esa exigencia es un paso separado.

## Protecciones que se deben completar en los paneles

| Capa | Acción | Comprobación |
| --- | --- | --- |
| Cuentas de infraestructura | Activar MFA en Supabase, GitHub y Netlify, y conservar los códigos de recuperación fuera del equipo de trabajo. | Una sesión nueva exige segundo factor; recuperación verificada. |
| Administración de Geobooker | Preparar inscripción y recuperación de MFA antes de exigir AAL2 en UI y servidor/RLS. | Cuenta administrativa sin segundo factor bloqueada; recuperación disponible. |
| Tráfico | Evaluar el firewall y los límites de la plataforma de alojamiento; aplicar controles a login, formularios y endpoints costosos. | Tráfico legítimo funciona y abuso simulado recibe rechazo. |
| Formularios | CAPTCHA selectivo donde haya abuso, con validación en servidor. | Tokens inválidos y reutilizados rechazados sin afectar OAuth legítimo. |
| Datos | Revisar permisos por propietario con dos cuentas de prueba; no confiar en ocultar botones del navegador. | Una cuenta no puede leer o modificar los datos privados de la otra. |
| Recuperación | Configurar copias cifradas según el plan contratado y probar restauración en un entorno separado. Incluir archivos de Storage. | Restauración documentada con fecha, alcance y tiempo real. |
| Seguimiento | Mantener auditoría de dependencias y revisar alertas y accesos administrativos. | Hallazgos asignados y comprobaciones periódicas registradas. |

No se activaron MFA, CAPTCHA, firewall, restricciones de red ni servicios de pago mediante este cambio. Se conserva la auditoría mensual existente de dependencias. Los avisos actuales requieren revisión y correcciones propias; no se usa este workflow para afirmar que el proyecto esté libre de vulnerabilidades.

## Separación de Lovia

Esta implementación pertenece únicamente al repositorio y proyecto Supabase de Geobooker. Para Lovia se reutilizará el enfoque con una auditoría independiente. No se copiarán claves, usuarios administrativos, reglas de datos, archivos de firma ni configuraciones de producción entre ambas plataformas.

Referencias: [MFA en Supabase](https://supabase.com/docs/guides/platform/multi-factor-authentication), [2FA de Netlify](https://docs.netlify.com/manage/accounts-and-billing/user-settings/), [protección de secretos en GitHub](https://docs.github.com/en/code-security/concepts/secret-security/push-protection), [copias de Supabase](https://supabase.com/docs/guides/platform/backups).
