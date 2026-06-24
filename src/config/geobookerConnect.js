export const GBOOKER_CONNECT_EMAIL = 'hola@geobooker.com.mx';
export const GBOOKER_CONNECT_REPLY_TO = 'hola@geobooker.com.mx';
export const GBOOKER_CONNECT_WHATSAPP = '+52 55 2670 2368';

export const GBOOKER_CONNECT_LAUNCH = {
  code: 'connect_launch_1000',
  reservationPriceMxn: 500,
  currency: 'MXN',
  batchSize: 1000,
  offerLabel: 'Anticipo de lanzamiento',
  headline: 'Piloto Geobooker Connect',
  summary:
    'Reserva operativa para preparar un piloto outbound B2B de hasta 1,000 contactos elegibles por brief aprobado.',
  deliveryModel:
    'Servicio gestionado por Geobooker Connect. No es autoservicio masivo ni licencia de base de datos.',
  includes: [
    'Revision inicial del brief comercial',
    'Definicion de ICP y segmento objetivo',
    'Construccion o depuracion de audiencia por ciudad / giro',
    'Preparacion de copy y secuencia inicial',
    'Ejecucion piloto controlada por lote',
    'Reporte de aperturas, clics y respuestas cuando aplique'
  ],
  guardrails: [
    'El anticipo reserva capacidad operativa; la campana final se valida antes de ejecutarse.',
    'No garantiza que 1,000 contactos sean aceptados si el brief, la fuente o el cumplimiento no son viables.',
    'No prometemos entregabilidad, CTR ni ventas garantizadas.',
    'WhatsApp solo aplica como flujo asistido o con canal oficial segun disponibilidad y cumplimiento.'
  ],
  operationalWarnings: [
    'Si la audiencia requiere investigacion profunda, enriquecimiento o compliance adicional, puede requerir cotizacion complementaria.',
    'Los envios se ejecutan con limites de calentamiento y reputacion de dominio.',
    'La reserva de lanzamiento se acredita al proyecto validado, no a bases descargables.'
  ]
};

export const GBOOKER_CONNECT_PACKAGES = [
  {
    code: 'connect_launch_1000',
    name: 'Piloto Connect 1000',
    audience: 'Mayoristas, proveedores logisticos, refaccionarias, talleres pesados y servicios industriales',
    reservationPriceMxn: 500,
    batchSize: 1000,
    summary:
      'Anticipo de lanzamiento para reservar un piloto gestionado de outreach B2B con hasta 1,000 contactos elegibles.'
  },
  {
    code: 'industrial_local',
    name: 'Industrial Local',
    audience: 'Llanteras, talleres pesados, refaccionarias y servicios industriales por ciudad',
    reservationPriceMxn: 1500,
    batchSize: 1000,
    summary:
      'Paquete orientado a mercados industriales locales con mezcla de segmentacion geobooker + follow-up comercial.'
  },
  {
    code: 'logistics_corridor',
    name: 'Corredor Logistico',
    audience: 'Patios, storage, gruas, operadores y servicios para carga pesada',
    reservationPriceMxn: 2500,
    batchSize: 1000,
    summary:
      'Cobertura por corredor o plaza para marcas con necesidad de dominio logistico regional.'
  }
];

export function getGeobookerConnectPackage(code) {
  return GBOOKER_CONNECT_PACKAGES.find((item) => item.code === code) || GBOOKER_CONNECT_PACKAGES[0];
}
