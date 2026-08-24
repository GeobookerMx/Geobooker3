/* global Netlify */

const BUSINESS_SELECT = 'name,description,category,subcategory,address,city,state_code,postal_code,country_code,website,phone,slug,is_verified,updated_at';
const CANDIDATE_SELECT = 'name,category_raw,category_normalized,subcategory,address_line,city_name,state_code,postal_code,country_code,website,phone,slug,attribution_text,updated_at';
const INTERNATIONAL_SELECT = 'name,description,category,subcategory,address,city,state_code,postal_code,country_code,website,phone,slug,is_verified,attribution_text,updated_at';

const safeJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttribute = (value = '') => escapeHtml(value).replace(/"/g, '&quot;');

const titleCase = (value = '') => String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const fetchFirst = async ({ supabaseUrl, supabaseKey, table, select, lookup, filters = [] }) => {
    const params = new URLSearchParams({ select, limit: '1', ...lookup });
    filters.forEach(([key, value]) => params.append(key, value));
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data[0] || null : null;
};

const normalizeBusiness = (record, source) => {
    if (!record) return null;
    if (source === 'candidate') {
        return {
            ...record,
            description: null,
            category: record.category_normalized || record.category_raw || record.subcategory,
            address: record.address_line,
            city: record.city_name,
            is_verified: false,
            sourceLabel: record.attribution_text
        };
    }
    return { ...record, sourceLabel: record.attribution_text || null };
};

export default async (request, context) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] !== 'business' || !pathParts[1]) return context.next();

    const response = await context.next();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') || Netlify.env.get('VITE_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) return response;

    const identifier = decodeURIComponent(pathParts[1]);
    const lookupColumn = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) ? 'id' : 'slug';
    const lookup = { [lookupColumn]: `eq.${identifier}` };
    let record = null;
    let source = null;

    try {
        record = await fetchFirst({
            supabaseUrl, supabaseKey, table: 'businesses', select: BUSINESS_SELECT,
            lookup, filters: [['status', 'eq.approved']]
        });
        source = record ? 'business' : null;

        if (!record) {
            record = await fetchFirst({
                supabaseUrl, supabaseKey, table: 'international_businesses', select: INTERNATIONAL_SELECT,
                lookup, filters: [['status', 'eq.approved'], ['is_visible', 'eq.true']]
            });
            source = record ? 'international' : null;
        }

        if (!record) {
            record = await fetchFirst({
                supabaseUrl, supabaseKey, table: 'business_candidates', select: CANDIDATE_SELECT,
                lookup, filters: [['moderation_status', 'eq.approved']]
            });
            source = record ? 'candidate' : null;
        }
    } catch (error) {
        console.error('[seo-business] Profile lookup failed:', error);
        return response;
    }

    const business = normalizeBusiness(record, source);
    if (!business) return response;

    const name = business.name || 'Negocio local';
    const city = titleCase(business.city || '');
    const region = titleCase(business.state_code || '');
    const category = titleCase(business.subcategory || business.category || 'negocio local');
    const location = [city, region].filter(Boolean).join(', ');
    const title = `${name}${location ? ` en ${location}` : ''} | Geobooker`;
    const description = (business.description || `Consulta ubicación, contacto y datos públicos de ${name}, ${category}${location ? ` en ${location}` : ''}, en Geobooker.`).slice(0, 180);
    const canonical = `${url.origin}/business/${encodeURIComponent(business.slug || identifier)}`;
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name,
        description,
        url: canonical,
        address: {
            '@type': 'PostalAddress',
            streetAddress: business.address || undefined,
            addressLocality: city || undefined,
            addressRegion: region || undefined,
            postalCode: business.postal_code || undefined,
            addressCountry: business.country_code || undefined
        },
        telephone: business.phone || undefined,
        sameAs: business.website ? [business.website] : undefined
    };
    Object.keys(schema.address).forEach((key) => schema.address[key] === undefined && delete schema.address[key]);
    Object.keys(schema).forEach((key) => schema[key] === undefined && delete schema[key]);

    try {
        const safeTitle = escapeHtml(title);
        const safeDescription = escapeAttribute(description);
        const safeCanonical = escapeAttribute(canonical);
        let html = await response.text();

        html = html
            .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
            .replace(/<meta\s+name="description"[\s\S]*?>/i, `<meta name="description" content="${safeDescription}">`)
            .replace(/<meta\s+property="og:title"[\s\S]*?>/i, `<meta property="og:title" content="${escapeAttribute(title)}">`)
            .replace(/<meta\s+property="og:description"[\s\S]*?>/i, `<meta property="og:description" content="${safeDescription}">`)
            .replace(/<meta\s+property="og:url"[\s\S]*?>/i, `<meta property="og:url" content="${safeCanonical}">`)
            .replace(/<meta\s+name="twitter:title"[\s\S]*?>/i, `<meta name="twitter:title" content="${escapeAttribute(title)}">`)
            .replace(/<meta\s+name="twitter:description"[\s\S]*?>/i, `<meta name="twitter:description" content="${safeDescription}">`)
            .replace(/<link\s+rel="canonical"[\s\S]*?>/i, `<link rel="canonical" href="${safeCanonical}">`)
            .replace('</head>', `<script type="application/ld+json">${safeJson(schema)}</script>\n</head>`);

        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        headers.set('content-type', 'text/html; charset=utf-8');
        return new Response(html, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
        console.error('[seo-business] HTML rewrite failed:', error);
        return response;
    }
};
