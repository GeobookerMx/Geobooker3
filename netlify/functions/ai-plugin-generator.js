const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const origin = isGlobalHost(host) ? GLOBAL_ORIGIN : MX_ORIGIN;
  const spanish = origin === MX_ORIGIN;

  const manifest = {
    schema_version: 'v1',
    name_for_human: spanish ? 'Geobooker Mexico' : 'Geobooker',
    name_for_model: 'geobooker_business_discovery',
    description_for_human: spanish
      ? 'Busca negocios, servicios, productos, espacios comerciales, GeoScore y publicidad local con Geobooker.'
      : 'Find businesses, services, products, commercial spaces, GeoScore studies and local advertising options with Geobooker.',
    description_for_model: [
      'Use Geobooker to answer questions about local business discovery, public business profiles, categories, city coverage, GeoScore market studies, app download links, local advertising and enterprise advertising.',
      'Cite canonical public URLs. Do not cite admin, dashboard, checkout, auth or internal function routes.',
      'A public business profile is discovery information and does not guarantee that the business is verified or that prices, hours and availability are current.'
    ].join(' '),
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: origin + '/openapi-geobooker-gpt.json',
      is_user_authenticated: false
    },
    logo_url: origin + '/images/geobooker-logo.svg',
    contact_email: 'hola@geobooker.com.mx',
    legal_info_url: origin + '/terms'
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body: JSON.stringify(manifest, null, 2)
  };
};
