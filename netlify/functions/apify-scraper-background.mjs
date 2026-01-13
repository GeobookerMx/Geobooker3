// netlify/functions/apify-scraper-background.mjs
/**
 * Apify Google Maps Scraper - Background Function
 * 
 * Netlify Background Functions allow up to 15 minutes execution
 * This is needed because Apify scraping takes 1-3 minutes
 * 
 * The naming convention "-background" makes Netlify run it as background job
 * 
 * Required env var: APIFY_API_TOKEN
 */

import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { searchQuery, location, maxResults = 50, jobId } = JSON.parse(event.body);

        const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!APIFY_API_TOKEN) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'APIFY_API_TOKEN no configurado' })
            };
        }

        // Inicializar cliente Apify
        const client = new ApifyClient({ token: APIFY_API_TOKEN });

        // Configuración del actor
        const input = {
            searchStringsArray: [searchQuery],
            locationQuery: location,
            maxCrawledPlacesPerSearch: maxResults,
            language: 'es',
            deeperCityScrape: false,
            includeWebResults: false,
            maxReviews: 0,
            maxImages: 0
        };

        console.log(`🔍 [Background] Iniciando: "${searchQuery}" en ${location}`);

        // Ejecutar actor
        const run = await client.actor('compass/crawler-google-places').call(input);

        console.log(`✅ Scraping completado. Dataset: ${run.defaultDatasetId}`);

        // Obtener resultados
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Transformar resultados
        const businesses = items.map(place => ({
            name: place.title,
            address: place.address,
            phone: place.phone,
            website: place.website,
            category: place.categoryName,
            rating: place.totalScore,
            reviewCount: place.reviewsCount,
            latitude: place.location?.lat,
            longitude: place.location?.lng,
            googleMapsUrl: place.url,
            placeId: place.placeId,
            permanentlyClosed: place.permanentlyClosed
        }));

        const activeBusinesses = businesses.filter(b => !b.permanentlyClosed);

        // Guardar resultados en Supabase si tenemos acceso
        if (SUPABASE_URL && SUPABASE_KEY && jobId) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

            await supabase.from('scraper_jobs').update({
                status: 'completed',
                results: activeBusinesses,
                count: activeBusinesses.length,
                completed_at: new Date().toISOString()
            }).eq('id', jobId);
        }

        console.log(`✅ Job completado: ${activeBusinesses.length} negocios`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                count: activeBusinesses.length,
                businesses: activeBusinesses
            })
        };

    } catch (error) {
        console.error('❌ Apify error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}
