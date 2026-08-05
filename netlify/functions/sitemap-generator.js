const { createClient } = require('@supabase/supabase-js');

const GLOBAL_ORIGIN = 'https://www.geobooker.com';
const MX_ORIGIN = 'https://geobooker.com.mx';
const MAX_URLS = 49000;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const isGlobalHost = (host = '') => host.includes('geobooker.com') && !host.includes('geobooker.com.mx');
const xmlEscape = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const normalizePath = (path = '') => {
  const clean = String(path || '').split('?')[0].split('#')[0];
  if (!clean || clean === '/') return '';
  return clean.startsWith('/') ? clean : '/' + clean;
};

const today = () => new Date().toISOString().split('T')[0];
const toDate = (value) => value ? new Date(value).toISOString().split('T')[0] : today();

exports.handler = async (event) => {
  const host = String(event.headers.host || event.headers.Host || '').toLowerCase();
  const globalMode = isGlobalHost(host);
  const origin = globalMode ? GLOBAL_ORIGIN : MX_ORIGIN;
  const alternateOrigin = globalMode ? MX_ORIGIN : GLOBAL_ORIGIN;
  const primaryLang = globalMode ? 'en' : 'es-MX';
  const alternateLang = globalMode ? 'es-MX' : 'en';

  const routes = new Map();
  const addRoute = (path, lastmod, priority = '0.8', changefreq = 'weekly') => {
    if (routes.size >= MAX_URLS) return;
    const normalizedPath = normalizePath(path);
    routes.set(normalizedPath, { path: normalizedPath, lastmod: toDate(lastmod), priority, changefreq });
  };

  const staticRoutes = [
    ['', '1.0', 'daily'],
    ['/categories', '0.9', 'weekly'],
    ['/download', '0.9', 'weekly'],
    ['/advertise', '0.9', 'weekly'],
    ['/enterprise', '0.9', 'weekly'],
    ['/b2b-connect', '0.8', 'weekly'],
    ['/biblioteca', '0.8', 'weekly'],
    ['/emprende', '0.8', 'weekly'],
    ['/claim', '0.8', 'weekly'],
    ['/about', '0.7', 'monthly'],
    ['/community', '0.7', 'monthly'],
    ['/support', '0.6', 'monthly'],
    ['/faq', '0.6', 'monthly'],
    ['/seguridad', '0.5', 'monthly'],
    ['/legal/ads-policy', '0.5', 'monthly'],
    ['/legal/fiscal', '0.5', 'monthly'],
    ['/guia-resico', '0.5', 'monthly'],
    ['/privacy', '0.4', 'monthly'],
    ['/terms', '0.4', 'monthly'],
  ];
  staticRoutes.forEach(([path, priority, changefreq]) => addRoute(path, null, priority, changefreq));

  const libraryDocumentRoutes = [
    '/biblioteca/punto-de-partida-geobooker',
    '/biblioteca/liderar-sin-cargo',
    '/biblioteca/radiografia-del-negocio',
    '/biblioteca/abrir-con-criterio',
    '/biblioteca/encontrar-al-cliente-correcto',
    '/biblioteca/numeros-que-sostienen',
    '/biblioteca/ordenar-la-operacion',
    '/biblioteca/vender-atender-y-regresar',
    '/biblioteca/aparecer-donde-el-cliente-busca',
    '/biblioteca/confianza-que-se-puede-ver',
    '/biblioteca/negocio-que-puede-durar',
    '/biblioteca/construir-sin-romperse'
  ];
  libraryDocumentRoutes.forEach((route) => addRoute(route, null, '0.7', 'monthly'));

  const emprendeChallengeRoutes = [
    '/emprende/reto/primera-decision-negocio-local',
    '/emprende/reto/precio-margen-y-caja-del-negocio',
    '/emprende/reto/producto-servicio-y-busqueda-real',
    '/emprende/reto/operacion-en-hora-pico',
    '/emprende/reto/visibilidad-local-categoria-ciudad',
    '/emprende/reto/liderazgo-equipo-pequeno',
    '/emprende/reto/crecimiento-sostenible-negocio-local',
    '/emprende/reto/crisis-reputacion-postventa'
  ];
  emprendeChallengeRoutes.forEach((route) => addRoute(route, null, '0.7', 'monthly'));

  const globalCityRoutes = [
    '/cities/los-angeles', '/cities/new-york', '/cities/houston', '/cities/miami',
    '/cities/london', '/cities/manchester', '/cities/toronto', '/cities/vancouver'
  ];
  const mexicoCityRoutes = [
    '/ciudad/cdmx', '/ciudad/guadalajara', '/ciudad/monterrey', '/ciudad/puebla',
    '/ciudad/tijuana', '/ciudad/merida', '/ciudad/queretaro', '/ciudad/leon'
  ];
  (globalMode ? globalCityRoutes : mexicoCityRoutes).forEach((route) => addRoute(route, null, '0.8', 'weekly'));

  const categoryRoutes = [
    '/c/restaurantes', '/c/bares', '/c/tiendas', '/c/servicios', '/c/hogar_autos',
    '/c/salud', '/c/entretenimiento', '/c/educacion', '/c/alojamiento',
    '/c/inmobiliarias', '/c/finanzas', '/c/tecnologia', '/c/eventos'
  ];
  categoryRoutes.forEach((route) => addRoute(route, null, '0.8', 'weekly'));

  if (globalMode) {
    ['/en/advertise-in-mexico', '/en/pricing', '/en/industries'].forEach((route) => addRoute(route, null, '0.7', 'monthly'));
  }

  if (supabase) {
    try {
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, slug, updated_at, country')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(globalMode ? 8000 : 10000);
      if (!error && businesses) {
        businesses
          .filter((biz) => globalMode ? String(biz.country || '').toUpperCase() !== 'MX' : String(biz.country || 'MX').toUpperCase() === 'MX')
          .forEach((biz) => addRoute('/business/' + (biz.slug || biz.id), biz.updated_at, '0.7', 'weekly'));
      }
    } catch (err) {
      console.warn('[sitemap-generator] businesses skipped:', err.message);
    }
  }

  const urls = Array.from(routes.values());
  const body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    .concat(urls.map((entry) => {
      const loc = origin + entry.path;
      const alternate = alternateOrigin + entry.path;
      return [
        '  <url>',
        '    <loc>' + xmlEscape(loc) + '</loc>',
        '    <lastmod>' + entry.lastmod + '</lastmod>',
        '    <changefreq>' + entry.changefreq + '</changefreq>',
        '    <priority>' + entry.priority + '</priority>',
        '    <xhtml:link rel="alternate" hreflang="' + primaryLang + '" href="' + xmlEscape(loc) + '"/>',
        '    <xhtml:link rel="alternate" hreflang="' + alternateLang + '" href="' + xmlEscape(alternate) + '"/>',
        '    <xhtml:link rel="alternate" hreflang="x-default" href="' + xmlEscape(GLOBAL_ORIGIN + entry.path) + '"/>',
        '  </url>'
      ].join('\n');
    }))
    .concat(['</urlset>', ''])
    .join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body
  };
};
