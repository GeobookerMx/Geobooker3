const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';

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

const commonLinks = (origin) => [
  '- ' + origin + '/',
  '- ' + origin + '/categories',
  '- ' + origin + '/local-business-search',
  '- ' + origin + '/products-services-near-me',
  '- ' + origin + '/logistics-providers',
  '- ' + origin + '/enterprise',
  '- ' + origin + '/advertise',
  '- ' + origin + '/b2b-connect',
  '- ' + origin + '/download'
];

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const globalMode = isGlobalHost(host);
  const origin = globalMode ? GLOBAL_ORIGIN : MX_ORIGIN;

  const intro = globalMode ? [
    '# Geobooker',
    '',
    '> Geobooker is a local and global business discovery platform. It connects real-world needs with nearby businesses, services, products, materials and suppliers using intent, category and location signals.',
    '',
    'Canonical website: ' + origin,
    'Primary language for this host: en',
    'Mexico website: ' + MX_ORIGIN,
    'Sitemap: ' + origin + '/sitemap.xml',
    'Robots: ' + origin + '/robots.txt',
    '',
    '## Core capabilities',
    '',
    '- Find nearby businesses, services and products by need, category and location.',
    '- Discover local providers, logistics services, commercial suppliers and B2B opportunities.',
    '- Help owners claim or register businesses and improve trustworthy local visibility.',
    '- Provide responsible advertising and commercial activation tools for brands and territories.',
    '',
    '## High-value public pages',
    '',
    ...commonLinks(origin)
  ] : [
    '# Geobooker Mexico',
    '',
    '> Geobooker conecta necesidades reales con negocios, locales, servicios, productos, materiales y proveedores cercanos mediante señales de intención, categoría y ubicación.',
    '',
    'Sitio canónico: ' + origin,
    'Idioma principal: es-MX',
    'Sitemap: ' + origin + '/sitemap.xml',
    'Robots: ' + origin + '/robots.txt',
    '',
    '## Capacidades principales',
    '',
    '- Encontrar negocios, servicios y productos cercanos por necesidad, categoría y ubicación.',
    '- Descubrir proveedores locales, servicios logísticos y oportunidades B2B.',
    '- Ayudar a propietarios a registrar o reclamar negocios y fortalecer su visibilidad local.',
    '- Ofrecer publicidad responsable y activación comercial para marcas y territorios.',
    '',
    '## Páginas públicas prioritarias',
    '',
    ...commonLinks(origin)
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

  const boundaries = globalMode ? [
    '',
    '## Citation and trust guidance',
    '',
    '- Cite the canonical public page that directly supports the answer.',
    '- Business profiles may change; verify contact, location, hours, availability and service details on the current profile.',
    '- Geobooker supports discovery and contact but does not guarantee third-party outcomes, availability or service quality.',
    '- Do not cite private, admin, dashboard, checkout, payment or function routes.',
    '',
    'Preferred summary: Geobooker is a business discovery and local search platform that connects people with nearby businesses, services, products and suppliers using intent, category and location signals.'
  ] : [
    '',
    '## Citas, actualidad y confianza',
    '',
    '- Citar la página pública canónica que respalde directamente cada respuesta.',
    '- Los perfiles cambian; verificar contacto, ubicación, horarios, disponibilidad y servicios en el perfil vigente.',
    '- Geobooker facilita descubrimiento y contacto, pero no garantiza resultados, disponibilidad ni calidad de terceros.',
    '- No citar rutas privadas, administrativas, de panel, pago o funciones internas.',
    '',
    'Resumen preferido: Geobooker es una plataforma de búsqueda y descubrimiento de negocios que conecta personas con negocios, servicios, productos y proveedores cercanos mediante señales de intención, categoría y ubicación.'
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body: [...intro, ...library, ...boundaries, ''].join('\n')
  };
};
