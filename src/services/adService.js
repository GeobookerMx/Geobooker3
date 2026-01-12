// src/services/adService.js
import { supabase } from '../lib/supabase';

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
    try {
        const {
            country = null,
            language = navigator.language.split('-')[0],
            deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop'
        } = context;

        // Intentar usar la función RPC inteligente para targeting avanzado
        const { data: smartData, error: rpcError } = await supabase.rpc('get_targeted_ads', {
            p_space_name: spaceName,
            p_user_country: country,
            p_user_language: language,
            p_device_type: deviceType
        });

        if (!rpcError && smartData) {
            console.log(`🎯 [Ads] Loaded ${smartData.length} smart-targeted ads for ${spaceName}`);
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

        if (rpcError) {
            console.warn(`⚠️ [Ads] RPC 'get_targeted_ads' error for ${spaceName}. Using fallback.`, rpcError);
        }

        // FALLBACK: Si falla la RPC o no existe, usar consulta simple
        console.log(`🔄 [Ads] Fetching basic ads for ${spaceName}...`);
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
            .gte('end_date', today);

        if (error) {
            console.error(`❌ [Ads] Fallback query error for ${spaceName}:`, error);
            throw error;
        }

        console.log(`✅ [Ads] Loaded ${data?.length || 0} basic ads for ${spaceName}`);
        return data || [];

    } catch (error) {
        console.error('Error loading campaigns:', error);
        return [];
    }
}

/**
 * Load Enterprise ad campaigns with geographic targeting
 * @param {Object} context - User context { country, city }
 * @returns {Promise<Array>} - Filtered campaigns sorted by priority
 */
export async function loadEnterpriseCampaigns(context = {}) {
    try {
        const { country = null, city = null } = context;
        const today = new Date().toISOString().split('T')[0];

        console.log(`🔍 [Enterprise Ads] Loading campaigns for: country=${country}, city=${city}, date=${today}`);

        // Query active Enterprise campaigns with their creatives
        const { data, error } = await supabase
            .from('ad_campaigns')
            .select('*, ad_creatives(*)')
            .eq('status', 'active')
            .lte('start_date', today)
            .or(`end_date.gte.${today},end_date.is.null`);

        if (error) {
            console.error('❌ [Enterprise Ads] Query error:', error);
            throw error;
        }

        console.log(`📦 [Enterprise Ads] Found ${data?.length || 0} active campaigns in DB`);
        // DEBUG: Show first campaign raw data to verify creative_url column
        if (data?.[0]) {
            console.log('🔍 [DEBUG] First campaign raw data:', {
                advertiser_name: data[0].advertiser_name,
                creative_url: data[0].creative_url,
                headline: data[0].headline,
                columns: Object.keys(data[0])
            });
        }

        // Filter by user location
        const filtered = (data || []).filter(campaign => {
            // DEMO campaigns always show (regardless of location)
            if (campaign.is_demo === true) {
                console.log(`  ✅ Campaign "${campaign.advertiser_name}" - DEMO (always shown)`);
                return true;
            }

            // Global ads show everywhere (ALWAYS pass)
            if (!campaign.ad_level || campaign.ad_level === 'global') {
                console.log(`  ✅ Campaign "${campaign.advertiser_name}" - GLOBAL (always shown)`);
                return true;
            }

            // Country-level ads
            if (country && campaign.target_countries?.includes(country)) {
                console.log(`  ✅ Campaign "${campaign.advertiser_name}" - country match`);
                return true;
            }

            // City-level ads (fuzzy match)
            if (city && campaign.target_cities?.some(targetCity =>
                targetCity.toLowerCase().includes(city.toLowerCase()) ||
                city.toLowerCase().includes(targetCity.toLowerCase())
            )) {
                console.log(`  ✅ Campaign "${campaign.advertiser_name}" - city match`);
                return true;
            }

            console.log(`  ❌ Campaign "${campaign.advertiser_name}" filtered out (ad_level=${campaign.ad_level}, targets=${JSON.stringify(campaign.target_cities || campaign.target_countries)})`);
            return false;
        });

        console.log(`🎯 [Enterprise Ads] ${filtered.length} campaigns passed geo-filter`);

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

        console.log(`📊 [Enterprise Ads] Final order: ${sorted.map(c => `${c.advertiser_name}${c.is_demo ? ' (DEMO)' : ''}`).join(', ')}`);

        // Transform to ad component format
        // Priorizar ad_creatives del join (anunciantes reales) sobre campos directos (campañas demo)
        return sorted.map(campaign => {
            const creative = campaign.ad_creatives?.[0];

            return {
                id: campaign.id,
                advertiser_name: campaign.advertiser_name,
                ad_level: campaign.ad_level,
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
}

/**
 * Registrar una impresión de anuncio
 * @param {string} campaignId - ID de la campaña
 */
export async function trackImpression(campaignId) {
    try {
        // Incrementar contador de impresiones en la campaña
        await supabase.rpc('increment_ad_impression', {
            campaign_id: campaignId
        });

        // Actualizar analytics diarios
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await supabase
            .from('ad_analytics')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('date', today)
            .single();

        if (existing) {
            await supabase
                .from('ad_analytics')
                .update({
                    impressions: existing.impressions + 1
                })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('ad_analytics')
                .insert({
                    campaign_id: campaignId,
                    date: today,
                    impressions: 1,
                    clicks: 0
                });
        }
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
    try {
        // Incrementar contador de clicks en la campaña
        await supabase.rpc('increment_ad_click', {
            campaign_id: campaignId
        });

        // Actualizar analytics diarios
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await supabase
            .from('ad_analytics')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('date', today)
            .single();

        if (existing) {
            const newClicks = existing.clicks + 1;
            const newCTR = existing.impressions > 0
                ? ((newClicks / existing.impressions) * 100).toFixed(2)
                : 0;

            await supabase
                .from('ad_analytics')
                .update({
                    clicks: newClicks,
                    ctr: newCTR
                })
                .eq('id', existing.id);
        }

        // Abrir URL en nueva pestaña
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
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
