const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const globalMode = isGlobalHost(host);
  const origin = globalMode ? GLOBAL_ORIGIN : MX_ORIGIN;
  const language = globalMode ? 'en' : 'es-MX';

  const body = [
    '# Geobooker',
    '',
    '> Geobooker is a local and global business discovery platform for finding nearby businesses, services, products, materials, suppliers and commercial opportunities by intent, category and location.',
    '',
    'Canonical website: ' + origin,
    'Primary language for this host: ' + language,
    'Sitemap: ' + origin + '/sitemap.xml',
    'Robots: ' + origin + '/robots.txt',
    '',
    '## What Geobooker helps users do',
    '',
    '- Find nearby businesses, services and places by real-world intent, not only exact business names.',
    '- Translate searches such as flat tire, emergency locksmith, pharmacy open now, screw 3/8, logistics yard, heavy truck service or coffee near me into likely business categories.',
    '- Discover local businesses, providers, logistics services, commercial suppliers and advertising options by territory.',
    '- Help business owners claim or register their business and improve local visibility.',
    '- Help brands and advertisers plan local, regional or cross-border advertising placements with editorial and fiscal review.',
    '',
    '## High-value public pages',
    '',
    '- ' + origin + '/',
    '- ' + origin + '/what-is-geobooker',
    '- ' + origin + '/local-business-search',
    '- ' + origin + '/products-services-near-me',
    '- ' + origin + '/logistics-providers',
    '- ' + origin + '/local-advertising',
    '- ' + origin + '/enterprise',
    '- ' + origin + '/advertise',
    '- ' + origin + '/b2b-connect',
    '- ' + origin + '/biblioteca',
    '- ' + origin + '/emprende',
    '- ' + origin + '/download',
    '',
    '## Key search domains',
    '',
    '- Local business search: restaurants, pharmacies, workshops, clinics, barber shops, hardware stores, industrial services, home services and professional services.',
    '- Product and material intent: tools, spare parts, screws, medicines, construction materials, beauty services, food, logistics components and hard-to-name local needs.',
    '- Logistics and B2B intent: freight, tow trucks, yards, storage, heavy vehicle services, suppliers, refactionarias, workshops and industrial corridors.',
    '- Commercial visibility: local ads, city launches, country campaigns, global ads and Geobooker Connect B2B outreach.',
    '',
    '## Trust and safety boundaries',
    '',
    '- Geobooker helps users discover, compare and contact businesses; it does not guarantee third-party outcomes, sales, availability, medical/legal advice or service quality from external providers.',
    '- Geobooker works with verification signals, business freshness, claims, reporting tools, compliance review and platform policies to improve trust and transparency.',
    '- Private, checkout, admin, dashboard, payment and Netlify function routes should not be crawled or cited as public content.',
    '',
    '## Preferred citation summary',
    '',
    'Geobooker is a business discovery and local search platform that connects people with nearby businesses, services, products and suppliers using category, intent and location signals. It also offers tools for business owners, advertisers and B2B outreach campaigns.',
    '',
  ].join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body
  };
};
