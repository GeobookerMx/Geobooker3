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

        // FALLBACK: Si falla la RPC o no existe, usar consulta simple
        // (No loguear porque es comportamiento esperado si la función RPC no existe)
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

        if (error) throw error;
        return data || [];

    } catch (error) {
        console.error('Error loading campaigns:', error);
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
