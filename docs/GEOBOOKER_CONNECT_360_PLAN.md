# Geobooker Connect 360

Fecha: 2026-06-24

## Tesis

Geobooker Connect debe operar como una unidad gestionada de outreach B2B, no como una venta ambigua de "nuestra base".

Su funcion es:

- captar clientes B2B que quieren llegar a decisores
- estructurar audiencias por vertical, ciudad o corredor
- ejecutar pilotos controlados
- reportar resultados

Sin mezclar:

- correos transaccionales de Geobooker
- CRM interno del producto
- campañas gestionadas para terceros

## Lo que se mantiene separado

### Geobooker Core

- mapa
- directorio
- TT
- Ads
- CRM del ecosistema
- correos de producto / soporte / aprobaciones

### Geobooker Connect

- intake B2B
- reservation checkout
- brief review
- audience build
- copy / sequence prep
- run tracking
- suppression lists

## Oferta de lanzamiento

El precio de `$500 MXN por 1000 contactos` no es sano como tarifa final universal si incluye:

- definicion de ICP
- construccion de audiencia
- limpieza / validacion
- copywriting
- operacion de envio
- seguimiento
- reporte

Por eso se adopto como:

- anticipo / fee de activacion de lanzamiento
- reserva operativa para piloto
- acreditable al proyecto validado

No como:

- precio final garantizado por una campaña completa
- venta de base descargable
- promesa de 1000 enviados efectivos sin revision

## Modelo comercial recomendado

### Piloto Connect 1000

- anticipo de lanzamiento: `$500 MXN`
- lote objetivo: hasta `1,000` contactos elegibles
- estado: sujeto a brief aprobado
- uso: reservar capacidad operativa y kickoff

### Industrial Local

- orientado a talleres, refacciones, llanteras y servicios industriales
- usa segmentacion por plaza / ciudad / vertical

### Corredor Logistico

- orientado a patios, storage, gruas, operadores y servicios pesados
- usa segmentacion por corredor o nodo operativo

## Reglas de promesa comercial

Sí prometer:

- servicio gestionado
- segmentacion por vertical / ciudad
- copy y secuencia
- ejecucion piloto controlada
- reporte real

No prometer:

- entregabilidad garantizada
- CTR garantizado
- ventas garantizadas
- automatizacion masiva total
- uso irrestricto de bases

## Arquitectura implementada

### Frontend

- landing `/b2b-connect`
- checkout `/b2b-connect/checkout`
- success `/b2b-connect/success`

### Config

- `src/config/geobookerConnect.js`

### Base de datos

- `connect_client_accounts`
- `connect_campaigns`
- `connect_campaign_runs`
- `connect_suppressions`

### Intake compartido

`enterprise_leads` sigue funcionando como intake comercial general, pero ahora puede etiquetarse para Connect.

## Riesgos mitigados

- no mezclar `ad_campaigns` con outbound B2B
- no mezclar checkout enterprise de Ads con reservas Connect
- no vender la narrativa de automatizacion total cuando hoy WhatsApp sigue asistido
- no ensuciar el core de Geobooker con pipelines comerciales de terceros

## Siguiente escalon recomendado

1. subdominio o remitente separado para Connect
2. exclusiones / suppressions obligatorias
3. webhook y trazabilidad de Stripe
4. pipeline admin dedicado para Connect dentro del CRM
5. playbooks por vertical:
   - industrial
   - logistica
   - salud
   - restaurantes
