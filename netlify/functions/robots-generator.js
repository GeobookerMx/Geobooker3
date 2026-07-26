const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const origin = isGlobalHost(host) ? GLOBAL_ORIGIN : MX_ORIGIN;
  const body = [
    '# Geobooker robots.txt',
    '# Public discovery allowed; private, checkout and admin surfaces restricted.',
    '',
    'User-agent: *',
    'Allow: /',
    'Allow: /.well-known/assetlinks.json',
    'Allow: /.well-known/apple-app-site-association',
    'Allow: /assets/',
    'Allow: /images/',
    'Disallow: /admin/',
    'Disallow: /dashboard/',
    'Disallow: /auth/',
    'Disallow: /api/',
    'Disallow: /.netlify/functions/',
    'Disallow: /enterprise/checkout',
    'Disallow: /enterprise/edit/',
    'Disallow: /b2b-connect/checkout',
    'Disallow: /payment/',
    'Disallow: /*?debug=',
    'Disallow: /*?preview=',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    'User-agent: DotBot',
    'Disallow: /',
    '',
    'User-agent: MJ12bot',
    'Disallow: /',
    '',
    'Sitemap: ' + origin + '/sitemap.xml',
    ''
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
