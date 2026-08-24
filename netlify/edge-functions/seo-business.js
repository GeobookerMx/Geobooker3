/* global Netlify, HTMLRewriter */

const BUSINESS_SELECT = 'name,description,category,subcategory,address,city,state_code,postal_code,country_code,website,phone,slug,is_verified,updated_at';
const CANDIDATE_SELECT = 'name,category_raw,category_normalized,subcategory,address_line,city_name,state_code,postal_code,country_code,website,phone,slug,attribution_text,updated_at';
const INTERNATIONAL_SELECT = 'name,description,category,subcategory,address,city,state_code,postal_code,country_code,website,phone,slug,is_verified,attribution_text,updated_at';

const safeJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

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
    const description = business.description || `Consulta ubicación, contacto y datos públicos de ${name}, ${category}${location ? ` en ${location}` : ''}, en Geobooker.`;
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

    return new HTMLRewriter()
        .on('title', { element: (element) => element.setInnerContent(title) })
        .on('meta[name="description"]', { element: (element) => element.setAttribute('content', description) })
        .on('meta[property="og:title"]', { element: (element) => element.setAttribute('content', title) })
        .on('meta[property="og:description"]', { element: (element) => element.setAttribute('content', description) })
        .on('meta[property="og:url"]', { element: (element) => element.setAttribute('content', canonical) })
        .on('meta[name="twitter:title"]', { element: (element) => element.setAttribute('content', title) })
        .on('meta[name="twitter:description"]', { element: (element) => element.setAttribute('content', description) })
        .on('link[rel="canonical"]', { element: (element) => element.setAttribute('href', canonical) })
        .on('head', {
            element: (element) => element.append(
                `<script type="application/ld+json">${safeJson(schema)}</script>`,
                { html: true }
            )
        })
        .transform(response);
};
