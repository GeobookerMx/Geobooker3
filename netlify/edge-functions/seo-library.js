const MX_ORIGIN = 'https://geobooker.com.mx';
const GLOBAL_ORIGIN = 'https://www.geobooker.com';

const documents = [
  ['punto-de-partida-geobooker', 'El punto de partida Geobooker', 'Propósito, alcance y método de la Biblioteca Geobooker 2026.', '00-punto-de-partida-geobooker.pdf'],
  ['liderar-sin-cargo', 'Liderar sin cargo', 'Liderazgo, responsabilidad y conversaciones para equipos pequeños.', '01-liderar-sin-cargo.pdf'],
  ['radiografia-del-negocio', 'Radiografía del negocio', 'Diagnóstico comercial, operativo y financiero para priorizar mejoras.', '02-radiografia-del-negocio.pdf'],
  ['abrir-con-criterio', 'Abrir con criterio', 'Validación, cliente, inversión, ubicación y pruebas antes de abrir.', '03-abrir-con-criterio.pdf'],
  ['encontrar-al-cliente-correcto', 'Encontrar al cliente correcto', 'Cliente ideal, territorio, ubicación y demanda local.', '04-encontrar-al-cliente-correcto.pdf'],
  ['numeros-que-sostienen', 'Números que sostienen', 'Costos, margen, flujo y decisiones financieras básicas.', '05-numeros-que-sostienen.pdf'],
  ['ordenar-la-operacion', 'Ordenar la operación', 'Procesos, responsables, indicadores y control diario.', '06-ordenar-la-operacion.pdf'],
  ['vender-atender-y-regresar', 'Vender, atender y regresar', 'Ventas, servicio, seguimiento y relaciones con clientes.', '07-vender-atender-y-regresar.pdf'],
  ['aparecer-donde-el-cliente-busca', 'Aparecer donde el cliente busca', 'Marketing local, categoría, ubicación, confianza y acción.', '08-aparecer-donde-el-cliente-busca.pdf'],
  ['confianza-que-se-puede-ver', 'Confianza que se puede ver', 'Reputación, reseñas, evidencia y respuesta pública.', '09-confianza-que-se-puede-ver.pdf'],
  ['negocio-que-puede-durar', 'Negocio que puede durar', 'Sostenibilidad financiera, operativa, humana, digital y social.', '10-negocio-que-puede-durar.pdf'],
  ['construir-sin-romperse', 'Construir sin romperse', 'Psicología, energía, paciencia, incertidumbre y criterio.', '11-construir-sin-romperse.pdf']
].map(([slug, title, description, pdf]) => ({ slug, title, description, pdf }));

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const jsonForHtml = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const renderIndex = (origin, isEnglish) => {
  const title = isEnglish ? 'Geobooker Business Library 2026' : 'Biblioteca Geobooker 2026';
  const description = isEnglish
    ? 'Professionally edited Spanish-language guides for starting, diagnosing and improving a local business.'
    : 'Guías profesionales para abrir, diagnosticar y mejorar un negocio local con criterio.';
  const links = documents.map((doc) =>
    '<li><a href="' + MX_ORIGIN + '/biblioteca/' + doc.slug + '">' + escapeHtml(doc.title) + '</a> - ' + escapeHtml(doc.description) + '</li>'
  ).join('');
  const html = '<main lang="' + (isEnglish ? 'en' : 'es-MX') + '" style="max-width:960px;margin:40px auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">' +
    '<header><p>Geobooker 2026</p><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(description) + '</p></header>' +
    '<nav aria-label="Biblioteca"><h2>' + (isEnglish ? 'Professional guides' : 'Guías profesionales') + '</h2><ol>' + links + '</ol></nav>' +
    '<p><a href="' + MX_ORIGIN + '/biblioteca/biblioteca-geobooker-2026-edicion-profesional.pdf">Descargar la Biblioteca completa en PDF</a></p>' +
    '<p><a href="' + origin + '/download">Descargar la app Geobooker</a></p></main>';
  return { title, description, html };
};

const renderDocument = (doc) => {
  const canonical = MX_ORIGIN + '/biblioteca/' + doc.slug;
  const pdf = MX_ORIGIN + '/biblioteca/pdfs/' + doc.pdf;
  const html = '<main lang="es-MX" style="max-width:860px;margin:40px auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">' +
    '<nav><a href="' + MX_ORIGIN + '/biblioteca">Biblioteca Geobooker 2026</a></nav>' +
    '<article><p>Guía profesional para negocios locales</p><h1>' + escapeHtml(doc.title) + '</h1><p>' + escapeHtml(doc.description) + '</p>' +
    '<p>Este documento forma parte de la Biblioteca Geobooker 2026 y ofrece orientación práctica, listas de revisión y preguntas de trabajo. No sustituye asesoría profesional especializada.</p>' +
    '<p><a href="' + pdf + '">Descargar PDF profesional</a></p></article>' +
    '<footer><a href="' + MX_ORIGIN + '/download">Descargar la app Geobooker</a></footer></main>';
  return {
    title: doc.title + ' | Biblioteca Geobooker',
    description: doc.description,
    canonical,
    html,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: doc.title,
      description: doc.description,
      inLanguage: 'es-MX',
      url: canonical,
      mainEntityOfPage: canonical,
      isPartOf: { '@type': 'CreativeWorkSeries', name: 'Biblioteca Geobooker 2026', url: MX_ORIGIN + '/biblioteca' },
      publisher: { '@type': 'Organization', name: 'Geobooker', url: MX_ORIGIN },
      associatedMedia: { '@type': 'MediaObject', contentUrl: pdf, encodingFormat: 'application/pdf' }
    }
  };
};

export default async (request, context) => {
  const url = new URL(request.url);
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const slug = url.pathname.split('/').filter(Boolean)[1] || '';
  const doc = documents.find((item) => item.slug === slug);
  const globalMode = url.hostname.endsWith('geobooker.com') && !url.hostname.endsWith('geobooker.com.mx');
  const origin = globalMode ? GLOBAL_ORIGIN : MX_ORIGIN;
  const page = doc ? renderDocument(doc) : renderIndex(origin, globalMode);
  const canonical = doc ? page.canonical : origin + '/biblioteca';
  const schema = doc ? page.schema : {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.title,
    description: page.description,
    url: canonical,
    inLanguage: globalMode ? ['en', 'es-MX'] : 'es-MX',
    isPartOf: { '@type': 'WebSite', name: 'Geobooker', url: origin },
    hasPart: documents.map((item) => ({
      '@type': 'Article',
      name: item.title,
      url: MX_ORIGIN + '/biblioteca/' + item.slug,
      inLanguage: 'es-MX'
    }))
  };

  return new HTMLRewriter()
    .on('html', { element(element) { element.setAttribute('lang', doc || !globalMode ? 'es-MX' : 'en'); } })
    .on('title', { element(element) { element.setInnerContent(page.title); } })
    .on('meta[name="description"]', { element(element) { element.setAttribute('content', page.description); } })
    .on('meta[property="og:title"]', { element(element) { element.setAttribute('content', page.title); } })
    .on('meta[property="og:description"]', { element(element) { element.setAttribute('content', page.description); } })
    .on('meta[property="og:url"]', { element(element) { element.setAttribute('content', canonical); } })
    .on('meta[name="twitter:title"]', { element(element) { element.setAttribute('content', page.title); } })
    .on('meta[name="twitter:description"]', { element(element) { element.setAttribute('content', page.description); } })
    .on('link[rel="canonical"]', { element(element) { element.setAttribute('href', canonical); } })
    .on('head', { element(element) {
      element.append('<script type="application/ld+json">' + jsonForHtml(schema) + '</script>', { html: true });
    } })
    .on('#root', { element(element) { element.append(page.html, { html: true }); } })
    .transform(response);
};
