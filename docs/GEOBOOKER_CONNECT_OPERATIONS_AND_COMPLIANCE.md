# Geobooker Connect - Operacion, Postventa y Compliance

## Objetivo
Geobooker Connect debe operar como un servicio gestionado de prospeccion B2B, separado de:

- `ad_campaigns`
- CRM masivo general
- remitentes de publicidad normal

Esto protege reputacion, trazabilidad y experiencia comercial.

## Flujo recomendado
1. `Lead intake`
   Brief inicial o checkout de reserva.
2. `Reserva pagada`
   Acuse transaccional + responsable interno.
3. `Brief review`
   Oferta, ICP, restricciones, exclusions, NDA si aplica.
4. `Audience build`
   Segmentacion, deduplicacion, dominios vetados y suppression list.
5. `Copy ready`
   Version aprobada por operacion.
6. `Scheduled / running`
   Lote controlado, no masivo sin supervision.
7. `Reported`
   KPI report + recomendacion comercial.
8. `Closed`
   Cierre, pausa o siguiente fase.

## KPIs que si se pueden prometer
- contactos aprobados
- contactos enviados
- tasa de apertura
- tasa de respuesta
- CTR
- rebotes
- exclusiones aplicadas
- lote ejecutado vs lote aprobado

## KPIs que no deben venderse como garantia
- ventas cerradas
- citas agendadas
- ROI exacto
- 99% de entregabilidad universal
- volumen ilimitado sin validacion

## Postventa minima
- acuse de pago inmediato
- confirmacion de kickoff
- resumen de audiencia propuesta
- confirmacion de copy o angulo
- reporte de corrida
- siguiente recomendacion comercial

## Guardrails legales informativos
- no vender la base como descarga directa
- conservar trazabilidad del origen del contacto
- respetar exclusiones y solicitudes de baja
- separar remitentes y reputacion de dominio de Connect
- validar terminos finales con asesor legal cuando el giro sea sensible

## Tablas criticas
- `enterprise_leads`
- `connect_campaigns`
- `connect_campaign_runs`
- `connect_suppressions`

## Recomendacion operativa
Toda corrida real debe registrarse en `connect_campaign_runs`. Sin eso no hay postventa seria ni KPI confiable.
