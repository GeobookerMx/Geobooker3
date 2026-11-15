import config from '../../src/config/geoSeo.json' with { type: 'json' };

export function resolveGeoPage(city, category) {
    if (!Object.hasOwn(config.cities, city) || !Object.hasOwn(config.categories, category)) return null;
    return { city, category, cityName: config.cities[city].name, categoryName: config.categories[category].name,
        path: `/ciudad/${city}/${category}` };
}

export function geoPathForRecord(record) {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const recordCity = normalize(record.city || record.city_name);
    const city = Object.keys(config.cities).find(key => {
        const item = config.cities[key];
        return item.aliases.some(v => normalize(v) === recordCity)
            || (String(record.state_code || '').padStart(2, '0') === item.stateCode
                && (item.boroughs || []).some(v => normalize(v) === recordCity));
    });
    const category = Object.keys(config.categories).find(key => config.categories[key].aliases.some(v => normalize(v) === normalize(record.category || record.category_normalized)));
    return city && category ? `/ciudad/${city}/${category}` : null;
}

export async function loadGeoDirectory(page, { url, key, fetcher = fetch }) {
    if (!url || !key) throw new Error('directory_unavailable');
    const cities = config.cities[page.city].aliases.map(v => `"${v}"`).join(',');
    const categories = config.categories[page.category].aliases.map(v => `"${v}"`).join(',');
    const sources = [
        ['businesses', 'id,slug,name,address,city,category', 'city', 'category', 'status'],
        ['business_candidates', 'id,slug,name,address_line,city_name,category_normalized,attribution_text', 'city_name', 'category_normalized', 'moderation_status'],
        ['international_businesses', 'id,slug,name,address,city,category,attribution_text', 'city', 'category', 'status']
    ];
    const results = await Promise.all(sources.map(async ([table, select, city, category, status]) => {
        const params = new URLSearchParams({ select, [city]: `in.(${cities})`, [category]: `in.(${categories})`, [status]: 'eq.approved', country_code: 'eq.MX', order: 'name.asc,id.asc', limit: '24' });
        const cityInfo = config.cities[page.city];
        if (cityInfo.boroughs) {
            params.delete(city);
            const boroughs = cityInfo.boroughs.map(value => `"${value}"`).join(',');
            params.set('or', `(${city}.in.(${cities}),and(state_code.eq.${cityInfo.stateCode},${city}.in.(${boroughs})))`);
        }
        if (table === 'international_businesses') params.set('is_visible', 'eq.true');
        const response = await fetcher(`${url}/rest/v1/${table}?${params}`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('directory_lookup_failed');
        return response.json();
    }));
    const unique = new Map();
    results.flat().forEach(row => {
        if (!row.slug) return;
        unique.set(row.slug, { name: row.name, address: row.address || row.address_line || '',
            path: `/business/${encodeURIComponent(row.slug)}`, attribution: row.attribution_text || '' });
    });
    return { ...page, businesses: [...unique.values()].slice(0, 24) };
}
