// netlify/functions/apify-scraper.js
/**
 * Apify Scraper - Lightweight version using native fetch
 * 
 * Uses native fetch instead of ApifyClient to reduce cold start time
 * Pattern: start job -> return runId -> poll for results
 */

export async function handler(event) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

    if (!APIFY_API_TOKEN) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'APIFY_API_TOKEN no configurado' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { action = 'start' } = body;
    const ACTOR_ID = 'compass~crawler-google-places';
    const BASE_URL = 'https://api.apify.com/v2';

    try {
        // ========== START: Iniciar el actor ==========
        if (action === 'start') {
            const { searchQuery, location, maxResults = 20 } = body;

            if (!searchQuery || !location) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'searchQuery y location requeridos' }) };
            }

            const input = {
                searchStringsArray: [`${searchQuery} ${location}`],
                maxCrawledPlacesPerSearch: Math.min(maxResults, 50),
                language: 'es',
                deeperCityScrape: false,
                maxReviews: 0,
                maxImages: 0,
                skipClosedPlaces: true
            };

            console.log(`🚀 Starting: "${searchQuery}" in ${location}`);

            // Llamada directa a Apify API para iniciar actor
            const startRes = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            });

            if (!startRes.ok) {
                const err = await startRes.text();
                console.error('Apify start error:', err);
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error iniciando actor', details: err }) };
            }

            const runData = await startRes.json();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: 'started',
                    runId: runData.data?.id,
                    message: 'Job iniciado. Polling...'
                })
            };
        }

        // ========== POLL: Verificar estado ==========
        if (action === 'poll') {
            const { runId } = body;

            if (!runId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'runId requerido' }) };
            }

            // Obtener estado del run
            const statusRes = await fetch(`${BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);

            if (!statusRes.ok) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: 'Run no encontrado' }) };
            }

            const runInfo = await statusRes.json();
            const status = runInfo.data?.status;

            // Si sigue corriendo
            if (status === 'RUNNING' || status === 'READY') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, status: 'running', runId })
                };
            }

            // Si falló
            if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: false, status: 'failed', error: `Status: ${status}` })
                };
            }

            // Si terminó (SUCCEEDED)
            if (status === 'SUCCEEDED') {
                const datasetId = runInfo.data?.defaultDatasetId;

                if (!datasetId) {
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, status: 'completed', count: 0, businesses: [] }) };
                }

                // Obtener resultados del dataset
                const dataRes = await fetch(`${BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=100`);
                const items = await dataRes.json();

                const businesses = (Array.isArray(items) ? items : []).map(place => ({
                    name: place.title || place.name,
                    address: place.address,
                    phone: place.phone,
                    email: place.email || (place.contactInfo?.email) || null,
                    website: place.website,
                    category: place.categoryName || place.categories?.[0],
                    rating: place.totalScore || place.rating,
                    reviewCount: place.reviewsCount || place.reviews,
                    latitude: place.location?.lat,
                    longitude: place.location?.lng,
                    googleMapsUrl: place.url,
                    placeId: place.placeId,
                    permanentlyClosed: place.permanentlyClosed
                })).filter(b => !b.permanentlyClosed);

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        status: 'completed',
                        count: businesses.length,
                        businesses
                    })
                };
            }

            // Estado desconocido
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, status: status?.toLowerCase() || 'unknown', runId }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción inválida. Usa start o poll' }) };

    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Error desconocido' })
        };
    }
}
