import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGeoPage, geoPathForRecord, loadGeoDirectory } from '../../netlify/functions/_geo-directory.mjs';
import edge from '../../netlify/edge-functions/seo-geo-directory.js';

test('city aliases map to one canonical page and arbitrary filters are rejected', () => {
    assert.equal(geoPathForRecord({ city: 'Ciudad de México', category: 'restaurant' }), '/ciudad/cdmx/restaurantes');
    assert.equal(geoPathForRecord({ city_name: 'Mérida', category_normalized: 'salud' }), '/ciudad/merida/salud');
    assert.equal(geoPathForRecord({ city: 'Guadalajara', category: 'hoteles' }), '/ciudad/guadalajara/alojamiento');
    assert.equal(geoPathForRecord({ city: 'Benito Juárez', state_code: '09', category: 'restaurantes' }), '/ciudad/cdmx/restaurantes');
    assert.equal(geoPathForRecord({ city: 'Benito Juárez', state_code: '23', category: 'restaurantes' }), null);
    assert.equal(resolveGeoPage('unknown', 'salud'), null);
    assert.equal(resolveGeoPage('cdmx', 'constructor'), null);
    assert.equal(geoPathForRecord({ city: 'Unknown', category: 'restaurantes' }), null);
});

test('directory restricts queries to approved Mexican profiles and deduplicates public paths', async () => {
    const urls = [];
    const result = await loadGeoDirectory(resolveGeoPage('cdmx', 'restaurantes'), {
        url: 'https://example.test', key: 'test', fetcher: async url => {
            urls.push(new URL(url));
            return Response.json([{ slug: 'cafe', name: 'Café', address: 'Centro' }, { name: 'Sin ficha pública' }]);
        }
    });
    assert.equal(result.businesses.length, 1);
    assert.equal(result.businesses[0].path, '/business/cafe');
    assert.equal(urls[0].searchParams.get('status'), 'eq.approved');
    assert.equal(urls[1].searchParams.get('moderation_status'), 'eq.approved');
    assert.equal(urls[2].pathname, '/rest/v1/international_businesses');
    assert.equal(urls[2].searchParams.get('status'), 'eq.approved');
    assert.equal(urls[2].searchParams.get('is_visible'), 'eq.true');
    assert.ok(urls[2].searchParams.get('or').includes('and(state_code.eq.09,city.in.('));
    assert.ok(urls.every(url => url.searchParams.get('country_code') === 'eq.MX'));
    await assert.rejects(loadGeoDirectory(resolveGeoPage('cdmx', 'restaurantes'), { url: 'https://example.test', key: 'test', fetcher: async () => new Response('', { status: 500 }) }));
});

test('server HTML includes real links and escapes text; empty pages are noindex and outages are 503', async () => {
    const originalFetch = globalThis.fetch;
    const originalNetlify = globalThis.Netlify;
    globalThis.Netlify = { env: { get: key => key.includes('URL') ? 'https://example.test' : 'test' } };
    const html = '<html><head><title>Home</title><meta name="description" content="Home"><link rel="canonical" href="https://example.test"></head><body><div id="root"></div></body></html>';
    const context = { next: async () => new Response(html, { headers: { 'content-type': 'text/html' } }) };
    const request = new Request('https://geobooker.com.mx/ciudad/cdmx/restaurantes');
    try {
        globalThis.fetch = async () => Response.json([{ slug: 'cafe', name: '<script>unsafe</script>', address: 'Centro' }]);
        const rendered = await edge(request, context);
        const body = await rendered.text();
        assert.ok(body.includes('href="/business/cafe"'));
        assert.ok(body.includes('Restaurantes en Ciudad de México'));
        assert.ok(!body.includes('<script>unsafe</script>'));
        assert.equal(rendered.headers.get('x-robots-tag'), 'index, follow');
        globalThis.fetch = async () => Response.json([]);
        assert.equal((await edge(request, context)).headers.get('x-robots-tag'), 'noindex, follow');
        globalThis.fetch = async () => new Response('', { status: 500 });
        assert.equal((await edge(request, context)).status, 503);
        assert.equal((await edge(new Request('https://geobooker.com.mx/ciudad/invalid/restaurantes'), context)).status, 404);
    } finally { globalThis.fetch = originalFetch; globalThis.Netlify = originalNetlify; }
});
