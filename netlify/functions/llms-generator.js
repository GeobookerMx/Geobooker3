const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';
const publicGlobalMarkets = require('../../src/config/publicGlobalMarkets.json');

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');

const libraryDocuments = [
  ['punto-de-partida-geobooker', '00-punto-de-partida-geobooker.pdf'],
  ['liderar-sin-cargo', '01-liderar-sin-cargo.pdf'],
  ['radiografia-del-negocio', '02-radiografia-del-negocio.pdf'],
  ['abrir-con-criterio', '03-abrir-con-criterio.pdf'],
  ['encontrar-al-cliente-correcto', '04-encontrar-al-cliente-correcto.pdf'],
  ['numeros-que-sostienen', '05-numeros-que-sostienen.pdf'],
  ['ordenar-la-operacion', '06-ordenar-la-operacion.pdf'],
  ['vender-atender-y-regresar', '07-vender-atender-y-regresar.pdf'],
  ['aparecer-donde-el-cliente-busca', '08-aparecer-donde-el-cliente-busca.pdf'],
  ['confianza-que-se-puede-ver', '09-confianza-que-se-puede-ver.pdf'],
  ['negocio-que-puede-durar', '10-negocio-que-puede-durar.pdf'],
  ['construir-sin-romperse', '11-construir-sin-romperse.pdf']
];

const activeMarkets = (publicGlobalMarkets.markets || [])
  .filter((market) => market.status === 'active' && Number(market.currentRecords) > 0)
  .map((market) => ({
    city: market.city,
    country: market.countryCode,
    language: market.defaultLanguage,
    records: Number(market.currentRecords)
  }));

const publicLinks = (origin) => [
  '- Inicio: ' + origin + '/',
  '- Categorías: ' + origin + '/categories',
  '- Registrar un negocio: ' + origin + '/business/register',
  '- Publicar un espacio comercial en renta: ' + origin + '/space/register',
  '- Reclamar un negocio: ' + origin + '/claim',
  '- Descargar la app: ' + origin + '/download',
  '- Publicidad: ' + origin + '/advertise'
];

const marketSection = (english) => {
  if (activeMarkets.length === 0) {
    return english
      ? ['## Public international coverage', '', '- No international market is currently marked active for public discovery.']
      : ['## Cobertura internacional pública', '', '- Actualmente no hay mercados internacionales marcados como activos para descubrimiento público.'];
  }

  return [
    english ? '## Active public markets' : '## Mercados públicos activos',
    '',
    ...activeMarkets.map((market) => `- ${market.city} (${market.country}): ${market.records} perfiles públicos; idioma ${market.language}.`)
  ];
};

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const english = isGlobalHost(host);
  const origin = english ? GLOBAL_ORIGIN : MX_ORIGIN;

  const introduction = english ? [
    '# Geobooker',
    '',
    '> Business discovery platform for finding businesses, services, products and commercial spaces by location and category.',
    '',
    'Canonical website: ' + origin,
    'Primary language for this host: en',
    'Mexico website: ' + MX_ORIGIN,
    'Sitemap: ' + origin + '/sitemap.xml',
    'Robots: ' + origin + '/robots.txt',
    '',
    '## Public capabilities',
    '',
    '- Search by business category, location, product or service.',
    '- View public business profiles and contact information when available.',
    '- Explore commercial spaces listed for rent.',
    '- Register or claim a business profile.',
    '- Access Geobooker on the web, Android and iPhone.',
    '',
    ...marketSection(true),
    '',
    '## Priority public pages',
    '',
    ...publicLinks(origin)
  ] : [
    '# Geobooker México',
    '',
    '> Plataforma de descubrimiento local para encontrar negocios, servicios, productos y espacios comerciales por ubicación y categoría.',
    '',
    'Sitio canónico: ' + origin,
    'Idioma principal: es-MX',
    'Sitemap: ' + origin + '/sitemap.xml',
    'Robots: ' + origin + '/robots.txt',
    '',
    '## Funciones públicas',
    '',
    '- Buscar por categoría, ubicación, producto o servicio.',
    '- Consultar perfiles públicos y datos de contacto cuando estén disponibles.',
    '- Explorar espacios comerciales publicados en renta.',
    '- Registrar o reclamar un perfil de negocio.',
    '- Acceder desde web, Android y iPhone.',
    '',
    ...marketSection(false),
    '',
    '## Páginas públicas prioritarias',
    '',
    ...publicLinks(origin)
  ];

  const library = [
    '',
    '## Biblioteca Geobooker 2026',
    '',
    '- Centro editorial: ' + MX_ORIGIN + '/biblioteca',
    '- PDF profesional completo: ' + MX_ORIGIN + '/biblioteca/biblioteca-geobooker-2026-edicion-profesional.pdf',
    ...libraryDocuments.flatMap(([slug, pdf]) => [
      '- Guía: ' + MX_ORIGIN + '/biblioteca/' + slug,
      '  PDF: ' + MX_ORIGIN + '/biblioteca/pdfs/' + pdf
    ])
  ];

  const trust = english ? [
    '',
    '## Citation and trust guidance',
    '',
    '- Cite the canonical public page that directly supports the answer.',
    '- Confirm contact, location, hours, prices and availability directly with the business.',
    '- A public profile is not automatically a verified or claimed profile.',
    '- Geobooker supports discovery and contact but does not guarantee third-party outcomes or service quality.',
    '- Do not cite private, admin, dashboard, checkout or internal function routes.'
  ] : [
    '',
    '## Citas, actualidad y confianza',
    '',
    '- Citar la página pública canónica que respalde directamente la respuesta.',
    '- Confirmar contacto, ubicación, horarios, precios y disponibilidad directamente con el negocio.',
    '- Un perfil público no es automáticamente un perfil verificado o reclamado.',
    '- Geobooker facilita descubrimiento y contacto, pero no garantiza resultados ni calidad de terceros.',
    '- No citar rutas privadas, administrativas, de panel, pago o funciones internas.'
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body: [...introduction, ...library, ...trust, ''].join('\n')
  };
};
