const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');

const PUBLIC_RULES = [
  'Allow: /',
  'Allow: /robots.txt',
  'Allow: /sitemap.xml',
  'Allow: /llms.txt',
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
  'Disallow: /*?preview='
];

const TRUSTED_AI_AND_SEARCH_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-User',
  'Google-Extended'
];

const BLOCKED_LOW_VALUE_CRAWLERS = ['DotBot', 'MJ12bot'];

const renderGroup = (agent, rules) => ['User-agent: ' + agent, ...rules, ''].join('\n');

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const origin = isGlobalHost(host) ? GLOBAL_ORIGIN : MX_ORIGIN;
  const body = [
    '# Geobooker robots.txt',
    '# Public discovery allowed; private, checkout and admin surfaces restricted.',
    '# AI/search crawlers may access public educational, business discovery and authority pages only.',
    '',
    renderGroup('*', PUBLIC_RULES),
    ...TRUSTED_AI_AND_SEARCH_CRAWLERS.map((agent) => renderGroup(agent, PUBLIC_RULES)),
    ...BLOCKED_LOW_VALUE_CRAWLERS.map((agent) => renderGroup(agent, ['Disallow: /'])),
    'Sitemap: ' + origin + '/sitemap.xml',
    'LLMs: ' + origin + '/llms.txt',
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
