import { resolveGeoPage, loadGeoDirectory } from './_geo-directory.mjs';

export async function handler(event) {
    const page = resolveGeoPage(event.queryStringParameters?.city, event.queryStringParameters?.category);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (!page) return { statusCode: 404, headers, body: JSON.stringify({ error: 'page_not_found' }) };
    try {
        const data = await loadGeoDirectory(page, {
            url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
            key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        });
        return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=300' }, body: JSON.stringify(data) };
    } catch {
        return { statusCode: 503, headers: { ...headers, 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'directory_unavailable' }) };
    }
}
