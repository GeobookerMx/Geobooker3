// netlify/functions/apify-scraper.js
/**
 * Apify Google Maps Scraper Integration
 * 
 * Uses Apify's official client to run Google Maps scrapers
 * This provides more comprehensive data than Google Places API
 * 
 * Required env var: APIFY_API_TOKEN
 * 
 * Apify Actors disponibles:
 * - compass/crawler-google-places (Google Maps Scraper - más popular)
 * - apify/google-maps-scraper (alternativo)
 */

import { ApifyClient } from 'apify-client';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { searchQuery, location, maxResults = 50 } = JSON.parse(event.body);

        const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

        if (!APIFY_API_TOKEN) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'APIFY_API_TOKEN no configurado',
                    message: 'Configura la variable de entorno APIFY_API_TOKEN en Netlify',
                    setup: {
                        step1: 'Crea cuenta en https://apify.com',
                        step2: 'Ve a Settings → Integrations → API token',
                        step3: 'Copia el token y agrégalo en Netlify como APIFY_API_TOKEN'
                    }
                })
            };
        }

        // Inicializar cliente Apify
        const client = new ApifyClient({ token: APIFY_API_TOKEN });

        // Configuración del actor Google Maps Scraper
        const input = {
            searchStringsArray: [searchQuery],
            locationQuery: location,
            maxCrawledPlacesPerSearch: maxResults,
            language: 'es',
            deeperCityScrape: false,
            includeWebResults: false,
            exportPlaceUrls: false,
            oneReviewPerRow: false,
            maxReviews: 0,
            maxImages: 0,
            scrapeResponseFromOwnerText: false
        };

        console.log(`🔍 Iniciando Apify scraper: "${searchQuery}" en ${location}`);

        // Ejecutar actor y esperar resultados
        const run = await client.actor('compass/crawler-google-places').call(input);

        console.log(`✅ Scraping completado. Dataset ID: ${run.defaultDatasetId}`);

        // Obtener resultados del dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        // Transformar resultados al formato de Geobooker
        const businesses = items.map(place => ({
            name: place.title,
            address: place.address,
            phone: place.phone,
            website: place.website,
            email: extractEmail(place.website), // Intentar extraer email
            category: place.categoryName,
            rating: place.totalScore,
            reviewCount: place.reviewsCount,
            latitude: place.location?.lat,
            longitude: place.location?.lng,
            googleMapsUrl: place.url,
            placeId: place.placeId,
            openingHours: place.openingHours,
            priceLevel: place.price,
            // Datos adicionales que Apify proporciona
            permanentlyClosed: place.permanentlyClosed,
            temporarilyClosed: place.temporarilyClosed,
            claimThisBusiness: place.claimThisBusiness // útil para identificar negocios no reclamados
        }));

        // Filtrar negocios cerrados
        const activeBusinesses = businesses.filter(b => !b.permanentlyClosed);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                count: activeBusinesses.length,
                totalScraped: businesses.length,
                closedFiltered: businesses.length - activeBusinesses.length,
                businesses: activeBusinesses,
                runId: run.id,
                datasetId: run.defaultDatasetId
            })
        };

    } catch (error) {
        console.error('❌ Apify error:', error);

        // Manejar errores específicos
        if (error.message?.includes('401')) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    error: 'Token inválido',
                    message: 'Verifica tu APIFY_API_TOKEN'
                })
            };
        }

        if (error.message?.includes('insufficient')) {
            return {
                statusCode: 402,
                body: JSON.stringify({
                    error: 'Créditos insuficientes',
                    message: 'Tu cuenta de Apify no tiene suficientes créditos'
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                type: 'scraping_error'
            })
        };
    }
}

// Función auxiliar para intentar extraer email de un sitio web
function extractEmail(website) {
    if (!website) return null;
    // Esto es básico - en producción podrías hacer un scrape del sitio
    // Por ahora retornamos null, pero Apify puede configurarse para extraer emails
    return null;
}
