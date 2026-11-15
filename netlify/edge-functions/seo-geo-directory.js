/* global Netlify */
import { resolveGeoPage, loadGeoDirectory } from '../functions/_geo-directory.mjs';

const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

export default async function handler(request, context) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 3 || parts[0] !== 'ciudad') return context.next();
    const page = resolveGeoPage(parts[1], parts[2]);
    if (!page) return new Response('Página no encontrada', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
    const response = await context.next();
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response;
    let data;
    try {
        data = await loadGeoDirectory(page, { url: Netlify.env.get('VITE_SUPABASE_URL') || Netlify.env.get('SUPABASE_URL'),
            key: Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') || Netlify.env.get('VITE_SUPABASE_ANON_KEY') });
    } catch {
        return new Response(await response.text(), { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300', 'X-Robots-Tag': 'noindex' } });
    }
    const title = `${page.categoryName} en ${page.cityName} | Geobooker`;
    const description = `Consulta negocios de ${page.categoryName.toLowerCase()} en ${page.cityName}: direcciones y perfiles públicos para explorar la zona y contactar al negocio.`;
    const canonical = `https://geobooker.com.mx${page.path}`;
    const hasResults = data.businesses.length > 0;
    const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical,
        mainEntity: { '@type': 'ItemList', itemListElement: data.businesses.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: `https://geobooker.com.mx${item.path}` })) } };
    const links = data.businesses.map(item => `<li><h2><a href="${escape(item.path)}">${escape(item.name)}</a></h2><p>${escape(item.address)}</p>${item.attribution ? `<small>${escape(item.attribution)}</small>` : ''}</li>`).join('');
    const content = `<main style="max-width:1000px;margin:32px auto;padding:24px;font-family:system-ui"><nav><a href="/categories">Categorías</a> · <a href="/ciudad/${page.city}">${escape(page.cityName)}</a></nav><h1>${escape(title.replace(' | Geobooker', ''))}</h1><p>${escape(description)}</p>${hasResults ? `<ul>${links}</ul>` : '<p>Aún no hay perfiles públicos disponibles para esta combinación.</p>'}<p>Confirma horarios, disponibilidad y condiciones directamente con cada negocio.</p><p><a href="/ciudad/${page.city}?category=${page.category}">Explorar el mapa de la zona</a></p></main>`;
    let html = await response.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
        .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escape(description)}">`)
        .replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}">`)
        .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escape(title)}">`)
        .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escape(description)}">`)
        .replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}">`)
        .replace(/<meta\s+name="robots"[^>]*>/gi, '')
        .replace(/<link\b[^>]*hreflang=[^>]*>/gi, '')
        .replace('</head>', `<meta name="robots" content="${hasResults ? 'index,follow' : 'noindex,follow'}"><script type="application/ld+json">${json(schema)}</script></head>`)
        .replace(/<div id="root"[^>]*>/, match => match + content);
    const headers = new Headers(response.headers);
    headers.delete('content-length'); headers.delete('content-encoding');
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('X-Robots-Tag', hasResults ? 'index, follow' : 'noindex, follow');
    return new Response(html, { status: 200, headers });
}
