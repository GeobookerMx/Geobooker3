export const ENTERPRISE_PROMO_END = '2026-12-31T23:59:59Z';
export const ENTERPRISE_PROMO_DISCOUNT_PERCENT = 50;

const applyDiscount = (amount, discountPercent) => Math.round(amount * ((100 - discountPercent) / 100));

export const ENTERPRISE_FALLBACK_PRICING = [
  {
    code: 'city_launch',
    name: 'City Launch',
    description: '1 ciudad activa por 1 mes - ideal para validar mercado',
    regular_price_usd: 400,
    current_price_usd: 200,
    regular_price_mxn: 7200,
    current_price_mxn: 3600,
    discount_percent: 50,
    cities_included: 1,
    countries_included: 1,
    duration_months: 1,
    is_promo_active: true,
    promo_ends_at: ENTERPRISE_PROMO_END,
    is_custom: true,
    features: ['1 ciudad activa', 'Busqueda patrocinada', '1 placement destacado en ciudad o categoria', 'Pin patrocinado en mapa', 'Dashboard basico']
  },
  {
    code: 'regional',
    name: 'Regional Pack',
    description: 'Hasta 5 ciudades activas en 2 paises, 3 meses de campana',
    regular_price_usd: 900,
    current_price_usd: 450,
    regular_price_mxn: 16200,
    current_price_mxn: 8100,
    discount_percent: 50,
    cities_included: 5,
    countries_included: 2,
    duration_months: 3,
    is_promo_active: true,
    promo_ends_at: ENTERPRISE_PROMO_END,
    is_custom: true,
    features: ['Hasta 5 ciudades activas', 'Rotacion de inventario patrocinado', 'Dashboard por ciudad', '2 optimizaciones incluidas', 'Soporte prioritario']
  },
  {
    code: 'country',
    name: 'Country Select',
    description: '1 pais, hasta 12 ciudades activas, 3 meses de campana',
    regular_price_usd: 1200,
    current_price_usd: 600,
    regular_price_mxn: 21600,
    current_price_mxn: 10800,
    discount_percent: 50,
    cities_included: 12,
    countries_included: 1,
    duration_months: 3,
    is_promo_active: true,
    promo_ends_at: ENTERPRISE_PROMO_END,
    is_custom: true,
    features: ['Hasta 12 ciudades dentro de un pais', 'Placements premium en territorios seleccionados', 'Dashboard por ciudad/dispositivo/horario', 'Revision mensual de desempeno', 'Soporte prioritario']
  },
  {
    code: 'crossborder',
    name: 'Cross-Border Event',
    description: '2-3 paises o region especifica, campanas de 2-3 meses',
    regular_price_usd: 1500,
    current_price_usd: 750,
    regular_price_mxn: 27000,
    current_price_mxn: 13500,
    discount_percent: 50,
    cities_included: 30,
    countries_included: 3,
    duration_months: 3,
    is_promo_active: true,
    promo_ends_at: ENTERPRISE_PROMO_END,
    is_custom: true,
    features: ['2-3 paises o region continental', 'Segmentacion por idioma', 'Flight por evento o temporada', 'Reporte ejecutivo final', 'Soporte consultivo dedicado']
  },
  {
    code: 'global_custom',
    name: 'Global Custom',
    description: 'Cobertura multi-pais o continental, bajo propuesta personalizada',
    regular_price_usd: 2000,
    current_price_usd: 1000,
    regular_price_mxn: 36000,
    current_price_mxn: 18000,
    discount_percent: 50,
    cities_included: 999,
    countries_included: 999,
    duration_months: 3,
    is_promo_active: true,
    promo_ends_at: ENTERPRISE_PROMO_END,
    is_custom: true,
    features: ['Multi-pais o continental', 'Setup de campana a medida', 'Inventario premium asignado', 'Reporting ejecutivo personalizado', 'Propuesta comercial y fiscal a medida']
  }
];

export const applyEnterpriseGlobalPromo = (pricing = []) =>
  pricing.map((plan) => {
    const regularUsd = Number(plan.regular_price_usd || 0);
    const regularMxn = Number(plan.regular_price_mxn || 0);

    return {
      ...plan,
      current_price_usd: regularUsd ? applyDiscount(regularUsd, ENTERPRISE_PROMO_DISCOUNT_PERCENT) : plan.current_price_usd,
      current_price_mxn: regularMxn ? applyDiscount(regularMxn, ENTERPRISE_PROMO_DISCOUNT_PERCENT) : plan.current_price_mxn,
      discount_percent: ENTERPRISE_PROMO_DISCOUNT_PERCENT,
      is_promo_active: true,
      promo_ends_at: ENTERPRISE_PROMO_END,
    };
  });
