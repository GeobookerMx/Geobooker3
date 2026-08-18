# Geobooker — Auth y correo seguro 2026

## Estado local

La revisión se ejecutó sin enviar correos y sin modificar Supabase, Stripe,
Netlify ni producción.

Correcciones preparadas localmente:

- las compras Enterprise ya no crean ni envían contraseñas temporales;
- `getUserByEmail`, inexistente en el SDK instalado, fue sustituido por búsqueda
  administrativa paginada y `inviteUserByEmail`;
- las invitaciones sólo permiten redirección a un origen Geobooker explícito y
  terminan en `/reset-password`;
- el endpoint heredado `send-welcome-email` responde `410 Gone` y no procesa el
  cuerpo de la solicitud;
- `send-email`, `send-notification-email` y `notify-admin-campaign` rechazan
  solicitudes anónimas;
- llamadas del navegador requieren sesión Supabase; llamadas entre funciones
  requieren `INTERNAL_FUNCTION_SECRET` con al menos 32 caracteres;
- el secreto interno nunca utiliza prefijo `VITE_` y nunca se envía al cliente;
- la plantilla `campaign_received` ya no depende de funciones indefinidas y
  neutraliza HTML en campos variables y URLs ajenas a Geobooker.

## Configuración requerida antes de desplegar

En Netlify, crear un valor aleatorio independiente para
`INTERNAL_FUNCTION_SECRET`. Debe almacenarse únicamente como secreto de servidor
y no debe pegarse en documentación, código, Git, variables `VITE_` ni clientes
móviles.

En Supabase Auth > URL Configuration, verificar de forma explícita los destinos
que realmente se usarán:

- `https://geobooker.com.mx/reset-password`
- `https://www.geobooker.com.mx/reset-password`
- el deep link nativo existente autorizado por el proyecto para recuperación.

El proyecto aislado debe usar sus propias URLs de prueba. No se debe probar una
invitación contra producción durante la validación de migraciones CRM.

## Verificación obligatoria posterior

1. Usuario inexistente recibe una invitación de Supabase y define su propia
   contraseña; ningún operador conoce la contraseña.
2. Usuario existente no recibe una segunda cuenta y conserva su ID.
3. Enlace vencido muestra estado inválido y permite solicitar uno nuevo.
4. Recuperación web termina en `/reset-password` con sesión válida.
5. Recuperación móvil conserva `geobooker://` y no rompe OAuth/deep links.
6. Peticiones anónimas a los tres endpoints de correo devuelven `401`.
7. Usuario autenticado no administrador no puede enviar campañas ni elegir
   destinatarios arbitrarios.
8. Una notificación interna sin secreto configurado falla cerrada y no afecta la
   confirmación del pago.
9. No aparecen emails, tokens, contraseñas ni secretos en logs.

## Pendiente externo

- rotar preventivamente las credenciales Stripe que pudieron quedar en el
  historial Git;
- configurar `INTERNAL_FUNCTION_SECRET` sólo cuando exista una ventana de
  despliegue controlada;
- verificar plantillas Invite/Recovery y SMTP en el proyecto Supabase aislado;
- ejecutar pruebas con emails allowlist, nunca con la base CRM completa.

## Controles adicionales preparados

- El webhook de Resend verifica los encabezados `svix-*` contra el cuerpo crudo
  y rechaza firmas vencidas o alteradas.
- La migracion `20260813044000_resend_webhook_idempotency.sql` conserva cada
  `svix-id` una sola vez; debe aplicarse antes de publicar el nuevo webhook.
- Las colas de correo/WhatsApp y el procesador de correo requieren un JWT de
  administrador o `CRON_SECRET`; un encabezado `Origin` ya no autoriza acciones.
- Los avisos de formularios Connect/Enterprise cargan el lead por UUID desde
  Supabase y no aceptan email, nombre o contenido completo como autoridad del
  navegador.
- La consulta de estado OXXO requiere un token temporal ligado al PaymentIntent.

Antes de cualquier deploy controlado, configurar exclusivamente en Netlify:

- `RESEND_WEBHOOK_SECRET`, copiado del endpoint correcto en Resend;
- `PAYMENT_STATUS_SIGNING_SECRET`, aleatorio e independiente, minimo 32 caracteres;
- `CRON_SECRET`, aleatorio e independiente, minimo 32 caracteres;
- `INTERNAL_FUNCTION_SECRET`, ya descrito arriba.

Ninguno puede llevar prefijo `VITE_`, almacenarse en Git ni reutilizar el valor
de otro secreto. Estas variables y la migracion son dependencias de despliegue;
no se configuraron ni ejecutaron durante esta fase local.
