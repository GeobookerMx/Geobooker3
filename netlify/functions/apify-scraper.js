// netlify/functions/apify-scraper.js
/**
 * Apify Scraper - Lightweight version using native fetch
 * 
 * Uses native fetch instead of ApifyClient to reduce cold start time
 * Pattern: start job -> return runId -> poll for results
 */

import adminAuth from './_admin-request-auth.js';

const { authorizeAdminRequest } = adminAuth;

export async function handler(event) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const authorization = await authorizeAdminRequest(event);
    if (!authorization.authorized) {
        return {
            statusCode: authorization.statusCode,
            headers,
            body: JSON.stringify({ error: authorization.error })
        };
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
            const searchQuery = typeof body.searchQuery === 'string' ? body.searchQuery.trim() : '';
            const location = typeof body.location === 'string' ? body.location.trim() : '';
            const requestedMaxResults = Number(body.maxResults ?? 20);

            if (!searchQuery || searchQuery.length > 120 || !location || location.length > 160) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'searchQuery y location requeridos' }) };
            }
            if (!Number.isFinite(requestedMaxResults) || requestedMaxResults < 1) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'maxResults invalido' }) };
            }
            const maxResults = Math.min(Math.floor(requestedMaxResults), 50);

            // Construir búsqueda más precisa
            // Formato: "restaurants in Manchester, UK" es más específico que "restaurants Manchester"
            const searchString = `${searchQuery} in ${location}`;

            // Detectar idioma basado en la ubicación
            const isEnglishLocation = /USA|UK|Canada|Australia|London|New York|Chicago|Los Angeles|Toronto|Sydney|Ireland|Singapore/i.test(location);
            const searchLanguage = isEnglishLocation ? 'en' : 'es';

            const input = {
                searchStringsArray: [searchString],
                maxCrawledPlacesPerSearch: maxResults,
                language: searchLanguage,
                deeperCityScrape: false,
                maxReviews: 0,
                maxImages: 0,
                skipClosedPlaces: true,
                // Añadir coordenadas aproximadas para ubicaciones comunes que causan ambigüedad
                ...(location.toLowerCase().includes('manchester') && !location.toLowerCase().includes('usa') && !location.toLowerCase().includes('new hampshire')
                    ? { searchMatching: 'google' } : {})
            };

            console.log(`🚀 Starting: "${searchQuery}" in ${location}`);

            // Llamada directa a Apify API para iniciar actor
            const startRes = await fetch(`${BASE_URL}/acts/${ACTOR_ID}/runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${APIFY_API_TOKEN}`
                },
                body: JSON.stringify(input)
            });

            if (!startRes.ok) {
                const err = await startRes.text();
                console.error('Apify status code:', startRes.status);

                // Parsear error para dar mensaje más útil
                let errorMessage = 'Error iniciando actor';
                try {
                    const errorJson = JSON.parse(err);
                    if (errorJson.error?.message) {
                        errorMessage = errorJson.error.message;
                    }
                    if (startRes.status === 401) {
                        errorMessage = 'API Token inválido o expirado';
                    } else if (startRes.status === 404) {
                        errorMessage = 'Actor no encontrado. Verifica que compass~crawler-google-places existe.';
                    } else if (startRes.status === 402) {
                        errorMessage = 'Sin créditos en Apify. Recarga tu cuenta.';
                    }
                } catch (parseErr) {
                    // Keep original error
                }

                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        error: errorMessage,
                        statusCode: startRes.status
                    })
                };
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
            const runId = typeof body.runId === 'string' ? body.runId.trim() : '';

            if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId)) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'runId requerido' }) };
            }

            // Obtener estado del run
            const apifyHeaders = { 'Authorization': `Bearer ${APIFY_API_TOKEN}` };
            const statusRes = await fetch(`${BASE_URL}/actor-runs/${runId}`, { headers: apifyHeaders });

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
                const dataRes = await fetch(`${BASE_URL}/datasets/${datasetId}/items?limit=50`, { headers: apifyHeaders });
                if (!dataRes.ok) {
                    return { statusCode: 502, headers, body: JSON.stringify({ error: 'No fue posible obtener resultados' }) };
                }
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
