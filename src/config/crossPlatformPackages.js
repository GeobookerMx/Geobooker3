export const CROSS_PLATFORM_PACKAGES = [
  {
    code: 'industrial_local',
    name: 'Paquete Industrial Local',
    priceMxn: 3499,
    audience: 'Llanteras, talleres pesados, refaccionarias y servicios industriales por ciudad',
    summary: 'Publicidad local en Geobooker + captacion B2B para negocios del ecosistema transporte.',
    includes: [
      'Impulso Local o Sponsor de Ciudad en Geobooker',
      'Captacion B2B hacia proveedores logisticos e industriales',
      'Seguimiento comercial desde el CRM',
      'Reporte de impresiones, clics y acciones rastreables'
    ]
  },
  {
    code: 'logistics_corridor',
    name: 'Paquete Corredor Logistico',
    priceMxn: 5999,
    audience: 'Corredores industriales, patios, storage, gruas y servicios para carga pesada',
    summary: 'Cobertura por ciudad o zona clave para marcas que quieren dominar un corredor logistico.',
    includes: [
      'Sponsor de Ciudad con enfoque industrial',
      'Segmentacion por corredor o plaza',
      'Lead intake B2B para proveedores y compradores',
      'Reporte ejecutivo y seguimiento comercial'
    ]
  },
  {
    code: 'ecosystem_full',
    name: 'Paquete Ecosistema Completo',
    priceMxn: 8999,
    audience: 'Marcas con estrategia nacional, multi-ciudad o verticales productivas',
    summary: 'Presencia ampliada para conectar Geobooker con TT y futuras verticales del grupo.',
    includes: [
      'Visibilidad premium en Geobooker',
      'Entrada prioritaria a pipeline B2B',
      'Preparacion para expansion TT y verticales futuras',
      'Plan de reporteo y optimizacion por etapas'
    ]
  }
];

export function getCrossPlatformPackage(code) {
  return CROSS_PLATFORM_PACKAGES.find((item) => item.code === code) || null;
}
