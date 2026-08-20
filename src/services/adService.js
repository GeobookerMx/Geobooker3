// src/services/adService.js
import { supabase } from '../lib/supabase';

const campaignCache = new Map();
const CAMPAIGN_CACHE_MS = 60_000;

export const normalizeCountryCode = (value) => String(value || '').trim().toUpperCase();

const normalizeCityName = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeTargetList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
};

const getCampaignCacheKey = (source, spaceName, context = {}) => JSON.stringify([
    source,
    spaceName || '',
    normalizeCountryCode(context.country),
    normalizeCityName(context.city),
    context.language || '',
    context.deviceType || ''
]);

const withCampaignCache = async (key, loader) => {
    const cached = campaignCache.get(key);
    if (cached && Date.now() - cached.createdAt < CAMPAIGN_CACHE_MS) {
        return cached.value instanceof Promise ? cached.value : [...cached.value];
    }

    const pending = loader();
    campaignCache.set(key, { createdAt: Date.now(), value: pending });
    try {
        const value = await pending;
        campaignCache.set(key, { createdAt: Date.now(), value });
        return [...value];
    } catch (error) {
        campaignCache.delete(key);
        throw error;
    }
};

export const getStoredUserCountryCode = () => (
    normalizeCountryCode(localStorage.getItem('userCountryCode')) ||
    normalizeCountryCode(localStorage.getItem('userCountry')) ||
    'unknown'
);

export function matchesCampaignLocation(campaign, context = {}) {
    const country = normalizeCountryCode(context.country);
    const city = normalizeCityName(context.city);
    const targetCountries = normalizeTargetList(campaign?.target_countries)
        .map(normalizeCountryCode)
        .filter(Boolean);
    const targetCities = normalizeTargetList(campaign?.target_cities)
        .map(normalizeCityName)
        .filter(Boolean);
    const audienceCountries = normalizeTargetList(campaign?.audience_targeting?.countries)
        .map(normalizeCountryCode)
        .filter(Boolean);
    const explicitCountry = normalizeCountryCode(campaign?.target_country);
    const scope = String(campaign?.geographic_scope || campaign?.ad_level || '').toLowerCase();
    const targetLocationText = normalizeCityName(campaign?.target_location);
    const explicitTargets = [
        ...targetCountries,
        ...targetCities,
        ...audienceCountries,
        explicitCountry
    ].filter(Boolean);

    if (campaign?.is_demo === true) return true;

    const cityMatched = targetCities.some((targetCity) => (
        city && (targetCity.includes(city) || city.includes(targetCity))
    )) || (
        city && targetLocationText && (targetLocationText.includes(city) || city.includes(targetLocationText.split(',')[0]))
    );

    if (cityMatched) {
        return true;
    }

    if (scope === 'city') return false;

    if (
        country &&
        (targetCountries.includes(country) ||
            audienceCountries.includes(country) ||
            explicitCountry === country)
    ) {
        return true;
    }

    // Global means unrestricted only when no explicit territory was configured.
    return (scope === 'global' || !scope) && explicitTargets.length === 0;
}

/**
 * Servicio para gestionar anuncios publicitarios
 * Maneja campañas activas, tracking de impresiones y clicks
 */

/**
 * Cargar campañas activas por espacio publicitario
 * @param {string} spaceName - Nombre del espacio ('hero_banner', 'carousel', etc.)
 * @returns {Promise<Array>} - Lista de campañas activas con creativos
 */
/**
 * Cargar campañas activas con segmentación inteligente
 * @param {string} spaceName - Nombre del espacio ('hero_banner', 'carousel', etc.)
 * @param {Object} context - Contexto del usuario { country, language, deviceType }
 * @returns {Promise<Array>} - Lista de campañas activas (creativos formateados)
 */
export async function loadActiveCampaigns(spaceName, context = {}) {
    const cacheKey = getCampaignCacheKey('active', spaceName, context);
    return withCampaignCache(cacheKey, async () => {
      try {
        const {
            country = null,
            city = null,
            language = navigator.language.split('-')[0],
            deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop'
        } = context;

        // Intentar usar la función RPC inteligente para targeting avanzado
        const { data: smartData, error: rpcError } = await supabase.rpc('get_targeted_ads', {
            p_space_name: spaceName,
            p_user_country: country,
            p_user_language: language,
            p_device_type: deviceType,
            p_user_city: city
        });

        if (!rpcError && smartData) {
            // Formatear respuesta para que coincida con la estructura esperada por los componentes
            // RPC devuelve estructura plana, componentes esperan: { ...campaign, ad_creatives: [{...}] }
            return smartData.map(item => ({
                id: item.campaign_id,
                advertiser_name: item.advertiser_name,
                ad_creatives: [{
                    id: item.creative_id,
                    title: item.title,
                    image_url: item.image_url,
                    cta_url: item.cta_url,
                    cta_text: item.cta_text
                }]
            }));
        }

        if (rpcError && import.meta.env.DEV) {
            console.warn(`⚠️ [Ads] RPC 'get_targeted_ads' fallback for ${spaceName}:`, rpcError.message);
        }

        // FALLBACK: Si falla la RPC o no existe, usar consulta simple
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('ad_campaigns')
            .select(`
        *,
        ad_creatives (*),
        ad_spaces!inner (*)
      `)
            .eq('ad_spaces.name', spaceName)
            .eq('status', 'active')
            .lte('start_date', today)
            .or(`end_date.gte.${today},end_date.is.null`);

        if (error) {
            console.error(`❌ [Ads] Fallback query error for ${spaceName}:`, error);
            throw error;
        }


        return (data || []).filter(campaign => matchesCampaignLocation(campaign, { country, city }));

      } catch (error) {
        console.error('Error loading campaigns:', error);
        return [];
      }
    });
}

/**
 * Load Enterprise ad campaigns with geographic targeting
 * @param {Object} context - User context { country, city }
 * @returns {Promise<Array>} - Filtered campaigns sorted by priority
 */
export async function loadEnterpriseCampaigns(spaceName = null, context = {}) {
    const cacheKey = getCampaignCacheKey('enterprise', spaceName, context);
    return withCampaignCache(cacheKey, async () => {
      try {
        const { country = null, city = null } = context;
        const today = new Date().toISOString().split('T')[0];



        // Query active Enterprise campaigns with their creatives
        let query = supabase
            .from('ad_campaigns')
            .select('*, ad_creatives(*), ad_spaces!inner(name)')
            .eq('status', 'active')
            .lte('start_date', today)
            .or(`end_date.gte.${today},end_date.is.null`);

        if (spaceName) {
            query = query.eq('ad_spaces.name', spaceName);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ [Enterprise Ads] Query error:', error);
            throw error;
        }



        // Filter by user location
        const filtered = (data || []).filter(campaign =>
            matchesCampaignLocation(campaign, { country, city })
        );



        // Sort by priority: 
        // 1. Paid campaigns first (is_demo=false), then demos
        // 2. Within each: city > country > global
        const sorted = filtered.sort((a, b) => {
            // Paid campaigns always first
            if (a.is_demo !== b.is_demo) {
                return a.is_demo ? 1 : -1; // Paid (false) comes before Demo (true)
            }
            // Then by geo-level
            const priority = { city: 1, region: 2, country: 3, global: 4 };
            return (priority[a.ad_level] || 5) - (priority[b.ad_level] || 5);
        });


        // Transform to ad component format
        // Priorizar ad_creatives del join (anunciantes reales) sobre campos directos (campañas demo)
        return sorted.map(campaign => {
            const creative = campaign.ad_creatives?.[0];

            return {
                id: campaign.id,
                advertiser_name: campaign.advertiser_name,
                ad_level: campaign.ad_level,
                ad_space_name: campaign.ad_spaces?.name || null,
                ad_creatives: [{
                    id: creative?.id || campaign.id,
                    title: creative?.title || campaign.headline || campaign.advertiser_name,
                    description: creative?.description || campaign.description,
                    // Priorizar: creative.image_url (real) > campaign.creative_url (demo)
                    image_url: creative?.image_url || campaign.creative_url || campaign.image_url,
                    is_video: (creative?.image_url || campaign.creative_url)?.match(/\.(mp4|webm|mov)$/i),
                    cta_url: creative?.cta_url || campaign.cta_url,
                    cta_text: creative?.cta_text || campaign.cta_text || 'Learn More'
                }],
                target_countries: campaign.target_countries,
                target_cities: campaign.target_cities
            };
        });

      } catch (error) {
        console.error('Error loading Enterprise campaigns:', error);
        return [];
      }
    });
}

/**
 * Registrar una impresión de anuncio
 * @param {string} campaignId - ID de la campaña
 */
export async function trackImpression(campaignId) {
    try {
        const { error } = await supabase.rpc('record_ad_impression', {
            p_campaign_id: campaignId,
            p_country: getStoredUserCountryCode(),
            p_city: localStorage.getItem('userCity') || null,
            p_device: window.innerWidth < 768 ? 'mobile' : 'desktop'
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error tracking impression:', error);
    }
}

/**
 * Registrar un click en anuncio
 * @param {string} campaignId - ID de la campaña
 * @param {string} url - URL de destino
 */
export async function trackClick(campaignId, url) {
    // Navegar de inmediato para no bloquear la experiencia si analytics falla
    // y para conservar el gesto de usuario requerido por los popup blockers.
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    try {
        const { error } = await supabase.rpc('record_ad_click', {
            p_campaign_id: campaignId
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error tracking click:', error);
    }
}

/**
 * Obtener métricas de una campaña
 * @param {string} campaignId - ID de la campaña
 * @returns {Promise<Object>} - Métricas agregadas
 */
export async function getCampaignMetrics(campaignId) {
    try {
        const { data, error } = await supabase
            .from('ad_campaigns')
            .select('impressions, clicks, ctr')
            .eq('id', campaignId)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error getting metrics:', error);
        return { impressions: 0, clicks: 0, ctr: 0 };
    }
}

/**
 * Filtrar campañas por ubicación geográfica
 * @param {Array} campaigns - Lista de campañas
 * @param {string} userLocation - Ubicación del usuario ('Mexico', 'USA', etc.)
 * @returns {Array} - Campañas filtradas
 */
export function filterCampaignsByLocation(campaigns, userLocation) {
    return campaigns.filter(campaign => {
        if (campaign.geographic_scope === 'global') return true;
        if (!campaign.target_location) return true;
        return campaign.target_location === userLocation;
    });
}

/**
 * Filtrar campañas por categoría de negocio
 * @param {Array} campaigns - Lista de campañas
 * @param {string} category - Categoría del negocio
 * @returns {Array} - Campañas filtradas
 */
export function filterCampaignsByCategory(campaigns, category) {
    return campaigns.filter(campaign => {
        if (!campaign.target_category) return true; // Sin filtro = todas
        return campaign.target_category === category;
    });
}
