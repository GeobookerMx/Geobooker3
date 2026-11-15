import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import libraryEdge from '../../netlify/edge-functions/seo-library.js';
const require = createRequire(import.meta.url);
const llms = require('../../netlify/functions/llms-generator.js');
const robots = require('../../netlify/functions/robots-generator.js');

test('full AI documentation contains guidance and library omitted from short index', async () => {
    const event = { headers: { host: 'geobooker.com.mx' }, path: '/.netlify/functions/llms-generator' };
    const short = await llms.handler(event);
    const full = await llms.handler({ ...event, queryStringParameters: { full: '1' } });
    assert.equal(short.statusCode, 200);
    assert.ok(full.body.length > short.body.length);
    assert.ok(full.body.includes('/biblioteca/numeros-que-sostienen'));
    assert.ok(full.body.includes('No sustituye la comprobación directa'));
});

test('every crawler group excludes administrative routes and allows full docs', async () => {
    const { body } = await robots.handler({ headers: { host: 'geobooker.com.mx' } });
    const groups = body.split('User-agent: ').slice(1);
    for (const group of groups.filter(g => !/^(DotBot|MJ12bot)/.test(g))) {
        assert.ok(group.includes('Disallow: /admin\n'));
        assert.ok(group.includes('Disallow: /dashboard\n'));
        assert.ok(group.includes('Allow: /llms-full.txt'));
    }
});

test('unknown library articles return 404 and PDF responses pass through intact', async () => {
    const valid = await libraryEdge(new Request('https://geobooker.com.mx/biblioteca/numeros-que-sostienen'), {
        next: async () => new Response('<html lang="es"><head><title>Home</title></head><body><div id="root"></div></body></html>', { headers: { 'content-type': 'text/html' } })
    });
    const rendered = await valid.text();
    assert.ok(rendered.includes('<h1>Números que sostienen</h1>'));
    assert.ok(rendered.includes('application/ld+json'));
    const unknown = await libraryEdge(new Request('https://geobooker.com.mx/biblioteca/no-existe'), {
        next: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } })
    });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('x-robots-tag'), 'noindex');
    const pdf = new Response('pdf', { headers: { 'content-type': 'application/pdf' } });
    assert.equal(await libraryEdge(new Request('https://geobooker.com.mx/biblioteca/pdfs/guia.pdf'), { next: async () => pdf }), pdf);
});
