# Incidente del correo diario — 14 de noviembre de 2026

## Causa comprobada

La última entrega registrada en `public.email_queue` fue el 1 de octubre de 2026: 100 correos ese día. El commit del 2 de octubre agregó a `process-email-queue.js` una consulta de `email_marketing_basis`, `email_consented_at` y `email_consent_evidence_ref`, pero la migración que crea esas columnas (`20261114153727_crm_email_explicit_opt_in_gate_20260930.sql`) no se había aplicado a producción. Por eso la consulta de contactos fallaba antes de solicitar un envío a Resend. [Una corrida de GitHub Actions del 13 de noviembre](https://github.com/GeobookerMx/Geobooker3/actions/runs/43512148378) confirma HTTP 500 al procesar la cola. [La generación anterior](https://github.com/GeobookerMx/Geobooker3/actions/runs/43508307306) había agregado 100 contactos correctamente.

El plan gratuito de Resend permite [100 correos diarios y 3,000 mensuales](https://resend.com/pricing). Los datos disponibles no muestran que el límite del proveedor haya causado esta interrupción. No se dispone aquí de acceso a la cuenta de Resend ni a los ajustes secretos de Netlify para confirmar el estado actual de la API key, el dominio remitente o la cuota real de la cuenta.

## Corrección aplicada

1. Se aplicó a Supabase la migración de consentimiento pendiente. La tabla y la función de generación ya exigen consentimiento explícito con fecha y referencia verificable. La migración pausó los envíos automáticos.
2. La migración `20261114153812_quarantine_unconsented_email_queue_20261114.sql` cambió a `failed` los 700 pendientes sin autorización y conservó el motivo para auditoría.
3. La migración `20261114153901_require_marketing_permission_for_email_queue_20261114.sql` mantiene también el requisito anterior `email_marketing_allowed = true` al generar la cola. El procesador comprueba el mismo campo antes de llamar a Resend.
4. El workflow diario ahora verifica el JSON de respuesta además del estado HTTP. Si una función devuelve `success:false` con HTTP 200, el job falla; si el envío está pausado, muestra una advertencia.

## Estado y siguiente condición

Producción tiene **0 contactos con consentimiento explícito verificable** entre los 16,216 contactos de marketing. Los 700 pendientes procedían de una migración CSV y tenían `email_marketing_allowed=false`. El envío automático permanece pausado hasta que exista una audiencia con consentimiento documentado y se comprueben la API key y el dominio de Resend. No se enviaron correos durante esta corrección.

Para reanudar: registrar evidencia individual de aceptación, completar los campos de consentimiento y `email_marketing_allowed`, hacer una previsualización de la cola, verificar los límites y el remitente en Resend, y habilitar `campaign_limits.email_sending_enabled` solo después de esas comprobaciones. La siguiente corrida programada servirá para confirmar que la generación ya no incorpora contactos sin permiso y que el workflow informa el estado de pausa.
