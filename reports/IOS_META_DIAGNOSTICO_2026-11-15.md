# Geobooker iOS y Meta App Events — 15 de noviembre de 2026

## Respuesta sobre la compilación publicada

El proyecto fuente ya enlazaba `FacebookCore` por Swift Package Manager, producto que incluye `FBSDKCoreKit`. La regla original era `>=18.0.0,<19.0.0`, no una versión exacta. No se encontró `Package.resolved`, `Podfile`, `Podfile.lock`, IPA ni archivo Xcode de la versión de App Store. Por tanto, **la versión exacta del SDK en la compilación publicada no está acreditada**. Tampoco se debe presentar 18.0.0 como versión resuelta.

La consulta pública de Apple devolvió:

| Dato | Resultado |
| --- | --- |
| Ficha | `6758590506`, Geobooker · Cerca de ti |
| Bundle | `com.geobooker.ios` |
| Campo público `version` | `Version 57` (texto literal de Apple; no prueba el número interno de build) |
| Publicación | `2026-10-07T18:03:48Z` |
| iOS mínimo publicado | `15.0` |
| Proyecto fuente al iniciar la revisión | `MARKETING_VERSION=1.4.10`, `CURRENT_PROJECT_VERSION=55` |

La diferencia entre la ficha y el proyecto impide identificar el binario publicado solo con este checkout. Hay que recuperar su `Package.resolved`, archivo de compilación o log de resolución de la Mac/CI que lo publicó. El catálogo de Apple no expone la versión de FBSDKCoreKit.

Actualización del 17 de noviembre: el usuario confirmó que App Store Connect muestra como última versión `1.5.10`, build `58`. Con esa evidencia se prepara `1.5.11 (59)` en Debug y Release. No se ha subido a TestFlight ni publicado; el SDK del binario anterior sigue sin acreditarse.

Después, el usuario compartió el resultado de carga de `1.5.11 (59)` con advertencia Apple **90683**: faltaba `NSLocationAlwaysAndWhenInUseUsageDescription` en el binario. La clave existía en un cambio local previo que había quedado fuera del commit; se incorpora ahora a la rama y se prepara **1.5.11 (60)**. La documentación oficial de `@capacitor/geolocation` v8 exige esa clave y `NSLocationWhenInUseUsageDescription` por la dependencia nativa, aunque no se use ubicación de fondo. No se agrega modo de segundo plano ni se cambia la solicitud de permisos. El verificador comprueba textos no vacíos en el plist fuente y en el archive final, junto con ATT. La corrección requiere un archivo nuevo; no modifica el build 59 ya cargado. La aceptación y el procesamiento de Apple siguen pendientes de confirmar.

Referencia: https://capacitorjs.com/docs/apis/geolocation#ios

## Asociación de Meta comprobada

Una consulta autenticada de solo lectura a Graph API devolvió `id=3176918089184321`, `name=Geobooker` y `object_store_urls.itunes=http://itunes.apple.com/app/id6758590506`. La app Meta apunta a la misma ficha de Apple y esta declara el bundle correcto. `ios_bundle_id` no fue devuelto: revisar además ese campo en Meta Developers, Configuración básica, plataforma iOS. El proyecto comprueba en tiempo de ejecución App ID, bundle y token de cliente.

El usuario confirmó en Events Manager el propietario comercial `1440650593321505` y la cuenta publicitaria `241056353885037`. Eso no equivale a comprobar atribución de una campaña real.

Inicialmente Meta devolvía reglas AAM `r1` y `r2`, con AAM habilitado en el control de funciones. El usuario encontró activadas coincidencia avanzada y recopilación automática. Después de apagarlas, se verificó por API `aam_rules="{}"`, `auto_log_app_events_enabled=false`, `auto_event_setup_enabled=false` y el bit de activación codeless desactivado. No se enviaron eventos reales durante estas consultas.

## Integración preparada

- Repositorio oficial `https://github.com/meta/facebook-ios-sdk`; selección exacta **19.0.1** para la siguiente compilación. La compilación nativa de revisión pasó en la iMac; conservar además `Package.resolved` como evidencia de resolución. No se debe confundir esta integración con el SDK del binario publicado.
- Único producto directo Meta: `FacebookCore`. `FacebookBasics`, `FBSDKCoreKit_Basics`, `FacebookAEM` y `FBAEMKit` son dependencias transitivas del producto oficial. No se agregan LoginKit, ShareKit ni GamingServicesKit.
- iOS mínimo del proyecto sigue en **15.0**, también exigido por Capacitor 8.6.2 y el plugin ATT 8.1.5. Meta 19.0.1 exige iOS 15. No se cambia la cobertura de dispositivos frente al proyecto actual. Capacitor 8 requiere Xcode 26+, pero el binario oficial FBAEMKit 19.0.1 fue construido con Swift 6.4: su interfaz contiene calificadores que Xcode 26.3 no admite. La prueba remota confirmó ese error. Se selecciona Xcode 27.2 para esta integración; Apple lo identifica con Swift 6.4. Esto afecta al compilador requerido en Mac/CI, no al iOS mínimo de los usuarios.
- Se registró el plugin local en `GeobookerViewController`, conectado al storyboard. Antes existía el Swift del plugin pero no su registro en el bridge ni en la lista de plugins.
- El SDK se inicializa solo con ATT autorizado y configuración de Meta comprobada sin AAM ni configuración automática/codeless. Si la verificación falla o está sin conexión, la medición no arranca y la app sigue funcionando.
- Se desactivan eventos automáticos, IDFA, metadatos de pantallas/URLs, información para mejora de producto y codeless debug. Se limita el uso de eventos a analítica y conversiones. No se agrega user ID de Meta ni información de contacto/ubicación a los parámetros.
- En iOS 15–16 se informa ATE autorizado solo después de comprobar ATT. En iOS 17+ el SDK usa ATT directamente. No se considera el valor guardado en localStorage una autorización vigente; se vuelve a consultar al arrancar y al regresar a primer plano.
- El puente acepta únicamente los dos nombres de conversión permitidos. El método de registro es una enumeración; cualquier otro parámetro entrante queda fuera. La clave local de deduplicación se transforma con SHA-256 y se guarda en UserDefaults, sin enviarla como parámetro a Meta.
- Se añadió manifiesto de privacidad para el uso local de UserDefaults, razón CA92.1. Los manifiestos de SDK deben verificarse dentro del archivo real.

## Eventos

| Evento | Momento | Parámetros de aplicación enviados a Meta |
| --- | --- | --- |
| Activación mediante `activateApp()` | Una vez por proceso, tras ATT y habilitación | Ninguno propio |
| `fb_mobile_complete_registration` | Cuenta nueva auténtica, con sesión y confirmación de correo; OAuth iniciado como registro y cuenta creada después del intento | `fb_registration_method`: email, google, apple u oauth |
| `first_business_published` | Un negocio creado durante el flujo observado pasa a `approved` y es el primero aprobado del propietario entre los registros existentes | Ninguno |

La base confirma `businesses.status DEFAULT 'pending'`. Ni un envío pendiente de revisión, un fallo al guardar ni un anuncio de renta cuentan como publicación. Se comprueba el estado al iniciar sesión, volver a la app y cada 60 segundos mientras está visible y hay publicaciones locales pendientes. No se reconstruyen conversiones históricas al instalar esta versión.

En iOS se omiten Search, ViewContent y Lead hacia Meta. El Pixel web se bloquea en las plataformas nativas para evitar dos canales enviando la misma acción. El registro de conversiones local evita repeticiones y el puente añade una marca persistente por cuenta/evento.

**Límites de la deduplicación:** protege recargas y relanzamientos en el mismo dispositivo. No es una garantía de exactamente una vez entre reinstalaciones, varios dispositivos o registros eliminados. Para ello haría falta un registro de conversiones servidor con idempotencia global. Tampoco un resultado `queued` del SDK prueba recepción: pueden existir pérdida de red, descartes de Meta o filtros. No se agrega una segunda cola con reenvío ciego que cause duplicados.

## Privacidad de App Store Connect: revisión necesaria

No se ha actualizado la ficha privada de App Store Connect. Apple exige considerar también datos de terceros. Desactivar IDFA no elimina todos los identificadores ni la información técnica del SDK.

| Área a revisar | Tratamiento de esta integración |
| --- | --- |
| Uso del producto / interacciones | Activación y dos conversiones para medir campañas, con ATT autorizado |
| Identificadores | El SDK puede usar identificadores anónimos de instalación y datos técnicos; cotejar con el informe de privacidad del archive y capturas de red |
| Correo, teléfono, nombre, ubicación precisa y mensajes | No se pasan a Meta; AAM debe permanecer desactivado. La app puede usar estos datos en su servicio principal y declararlos por separado |
| Diagnóstico y otros datos técnicos | Revisar el manifiesto agregado de Meta, Firebase y Capacitor; la app ya contiene FirebaseAnalytics y carga otras herramientas tras consentimiento |
| Seguimiento | Declarar el uso real de medición publicitaria con terceros. ATT rechazado no inicia esta integración Meta |

Sin ATT autorizado esta implementación no envía conversiones personales a Meta. No es una medición completa de todas las instalaciones. SKAdNetwork/atribución agregada y su configuración en Events Manager deben validarse aparte; no se activó elegibilidad ni se modificó un esquema de conversiones a ciegas.

## Pruebas y preparación de TestFlight

- Seis pruebas de comportamiento: confirmación de cuenta, cuenta existente/obfuscada, reintentos, concurrencia/recargas, moderación, primera publicación, propietario/renta y OAuth existente. Cinco pruebas previas de autenticación también pasan.
- Compilación Vite comprobada. Esto no compila Swift ni acredita funcionamiento en un iPhone.
- Workflow `.github/workflows/ios-meta-review.yml`: ejecutor macOS, resolución SPM, Release archive y evidencia de dependencias/manifiestos. Las ejecuciones de rama compilan sin firma. La subida a TestFlight es una opción manual y no presenta la app a App Store Review.
- `scripts/ios/release-evidence.py` exige la resolución 19.0.1 y guarda `Package.resolved` e información del archive, sin el token cliente. El artefacto distingue explícitamente pruebas físicas y recepción Meta pendientes.
- La subida firmada necesita los secretos del repositorio: `APPLE_DISTRIBUTION_P12_BASE64`, `APPLE_DISTRIBUTION_P12_PASSWORD`, `APPLE_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`. Deben configurarse directamente en GitHub, sin pegarlos en el chat ni en el repositorio. El perfil debe ser App Store para `com.geobooker.ios`, equipo `QCN4SYVAQ4`.
- Variables públicas/secretos de build: URL y clave pública Supabase y clave de Maps según el workflow. Nunca service-role. La versión preparada actual es `1.5.11 (60)`; el build 59 se intentó cargar y mostró la advertencia de ubicación descrita arriba. Comprobar que el build nuevo siga disponible antes de subir.
- Las rutas SPM locales generadas en Windows tienen barras invertidas; `npx cap sync ios` se ejecuta en macOS antes de resolver para regenerarlas correctamente.

## Compilación y firma

Actualización de login: el usuario confirmó haber subido el build 61 y reportó rebote de «Continuar con Apple» tanto en iPhone como en web. El arreglo compartido de autenticación se documenta en `reports/AUDITORIA_LOGIN_2026-11-17.md`. La siguiente compilación iOS preparada es **1.5.11 (62)** e incorpora el observador de sesión, el callback unificado y la reanudación sin refresh forzado. El código anterior reproduce el rebote del temporizador en Chrome; el corregido pasa 11 escenarios React simulados. El retorno real a Apple en TestFlight y los eventos Meta siguen pendientes de probar. El build 61 ya subido no cambia con estas correcciones fuente.

La compilación con Xcode 27.2 resolvió el problema del compilador y llegó a la fase final de firma de frameworks. Esa fase intentaba firmar aun con `CODE_SIGNING_ALLOWED=NO`; se corrigió para respetar ese ajuste en pruebas sin certificado. La firma normal para TestFlight permanece activa.

El 17 de noviembre el usuario aplicó la corrección en su checkout independiente `Geobooker-Meta-Review-20261115` y compartió `BUILD SUCCEEDED` para Release sin firma con Xcode 27.1. Los ajustes mostrados por Xcode confirmaron bundle `com.geobooker.ios`, equipo `QCN4SYVAQ4` e iOS mínimo `15.0`. Esta compilación todavía tenía versión `1.4.10 (55)`, anterior al incremento y a la incorporación de las mejoras estacionales; se debe recompilar la entrega final. Este resultado no acredita firma, recepción de eventos ni pruebas físicas de ATT.

La ejecución GitHub Actions `44111943674` del commit `012dc48` finalizó correctamente: archive Release sin firma con Meta y las mejoras estacionales. No detectaba los textos de ubicación faltantes; el verificador ahora los exige. No equivale a validación de App Store ni a pruebas físicas.

## Temporada 2026 y experiencia en el mismo build

- Sección ligera de descubrimiento navideño integrada en el buscador: regalos, restaurantes, pastelerías, florerías, juguetes y salones. Cada acceso utiliza la búsqueda real y conserva el mercado seleccionado. Español e inglés; otros idiomas siguen el fallback inglés.
- Vigencia por fecha local: 15 de noviembre de 2026 al 6 de enero de 2027. Desde el 26 de diciembre cambia a bienvenida de 2027; el 7 de enero se oculta sin necesitar otra actualización. El usuario puede ocultarla de manera persistente.
- Se retiró del inicio la referencia al modal vencido de 2024/2025. La propuesta nueva usa iconos vectoriales y decoración estática, sin animaciones ni recursos pesados.
- Buscador con botón de borrar y retorno de foco, teclado de búsqueda, estado accesible y sugerencias con botones de al menos 44 px. Los botones tienen espacio reservado para no tapar el texto.
- Publicación con protección frente al doble toque antes de llamadas asíncronas y botones adaptados a pantallas pequeñas. Los mensajes distinguen guardado pendiente de revisión y publicación aprobada; no prometen publicación al guardar.
- Ocho pruebas específicas pasan: seis de conversiones y dos de vigencia/contenido estacional. Compilación web comprobada. Revisión visual y funcional en iPhone sigue pendiente.

Texto propuesto para novedades: «Descubre negocios y opciones para tus regalos y reuniones de temporada. Mejoramos la búsqueda y el registro de negocios, con información más clara sobre su revisión y publicación. Incluimos ajustes de privacidad y medición de campañas.» No se ha publicado en App Store Connect.

## Matriz de pruebas físicas

| Prueba en Release/TestFlight | Resultado esperado | Evidencia pendiente |
| --- | --- | --- |
| Instalación limpia, ATT aceptado | App funcional; activación en fuente 3176918089184321 | Fecha UTC, versión/build y captura de Probar eventos |
| Registro enviado sin confirmar | Sin evento de registro | Captura y secuencia |
| Confirmación de cuenta | Un registro completado | Evento, hora y método |
| Segundo login / recarga / relanzamiento | Sin otro registro de la misma cuenta | Comparación de conteos |
| Negocio guardado en pending | Sin primera publicación | Estado servidor y conteo |
| Primera aprobación, volver a la app | Un first_business_published | Estado aprobado, evento y hora |
| Segundo negocio publicado | Sin segunda primera publicación | Conteos antes/después |
| Instalación limpia, ATT rechazado | App, registro y publicación funcionales; sin SDK/eventos Meta | Pruebas en iPhone y tráfico de red |
| Permiso revocado en Ajustes | Sin nuevos eventos Meta al volver | Tráfico, ATT y conteos |
| Revisión de red con ATT autorizado | Sin contactos, coordenadas ni contenido de mensajes en eventos | Captura redactada y manifiesto agregado |

## Fuentes

- [Apple, ficha pública](https://apps.apple.com/mx/app/geobooker-cerca-de-ti/id6758590506).
- [Meta, Package.swift de 19.0.1](https://github.com/meta/facebook-ios-sdk/blob/v19.0.1/Package.swift), [cambios oficiales](https://github.com/meta/facebook-ios-sdk/blob/main/CHANGELOG.md).
- [Capacitor: iOS 15 y Xcode 26](https://capacitorjs.com/docs/updating/8-0), [registro de plugins locales](https://capacitorjs.com/docs/ios/custom-code).
- [Apple: datos de privacidad](https://developer.apple.com/app-store/app-privacy-details/).
- [Apple: versiones de Xcode y Swift](https://developer.apple.com/xcode/system-requirements/), [imagen de GitHub con Xcode 27.2](https://github.com/actions/runner-images/blob/main/images/macos/xcode-27-arm64-Readme.md).
- [Supabase: signUp y respuestas de cuentas existentes](https://supabase.com/docs/reference/javascript/auth-signup).
