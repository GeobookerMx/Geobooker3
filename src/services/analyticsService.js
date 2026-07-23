// src/services/analyticsService.js
/**
 * Servicio de Analytics Interno para Geobooker
 * Registra eventos de usuario en Supabase para KPIs en tiempo real
 * También incluye funciones de compatibilidad con GA4
 * 
 * Incluye:
 * - Page views y búsquedas (page_analytics, search_analytics)
 * - Eventos de intención de negocio (business_intent_logs)
 * - Device ID persistente + cola offline
 */
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { appendAttributionToEvent, getAttributionSummary, getCurrentAttribution, getFirstTouchAttribution } from './attributionService';
import { getPlatform } from '../utils/platformDetection';

// ============================================
// FUNCIONES DE COMPATIBILIDAD CON GA4
// ============================================

/**
 * Inicializar Google Analytics 4 (stub - GA4 se carga via gtag en index.html)
 */
export function initializeGA4() {
    logger.info('📊 GA4 initialized via gtag');
}

/**
 * Registrar inicio de sesión
 */
export function trackSessionStart(isReturning = false) {
    logger.dev(`📊 Session start (returning: ${isReturning})`);
    // Page views are tracked automatically by usePageTracking hook
}

/**
 * Trackear evento genérico (compatible con GA4)
 */
export function trackEvent(eventName, params = {}) {
    const enrichedParams = appendAttributionToEvent(params);
    logger.dev(`📊 Event: ${eventName}`, enrichedParams);
    // Si gtag está disponible, enviar a GA4 también
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, enrichedParams);
    }
}

async function insertWithOptionalColumns(table, fullPayload, fallbackPayload = null) {
    const primaryPayload = { ...fullPayload };
    const safeFallback = fallbackPayload || fullPayload;

    const { error } = await supabase.from(table).insert(primaryPayload);
    if (!error) return { error: null, usedFallback: false };

    const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    const shouldRetryWithoutOptionalColumns =
        message.includes('column') ||
        message.includes('schema cache') ||
        message.includes('could not find') ||
        message.includes('does not exist');

    if (!shouldRetryWithoutOptionalColumns) {
        return { error, usedFallback: false };
    }

    const { error: fallbackError } = await supabase.from(table).insert(safeFallback);
    return { error: fallbackError, usedFallback: true };
}

/**
 * Trackear vista de negocio
 */
export function trackBusinessView(businessId, businessName, source = 'map') {
    trackEvent('view_business', {
        business_id: businessId,
        business_name: businessName,
        source: source
    });
}

/**
 * Trackear click en negocio
 */
export function trackBusinessClick(businessId, businessName, action = 'click') {
    trackEvent('click_business', {
        business_id: businessId,
        business_name: businessName,
        action: action
    });
}

/**
 * Trackear click en botón de rutas/direcciones
 * Guarda en GA4 y en Supabase para analytics internos
 */
export async function trackRouteClick(businessId, businessName, source = 'map') {
    // GA4 tracking
    trackEvent('click_route', {
        business_id: businessId,
        business_name: businessName
    });

    // Supabase tracking (para KPIs internos)
    try {
        await supabase.rpc('record_route_click', {
            p_business_id: businessId,
            p_business_name: businessName,
            p_source: source
        });
        logger.success(`🗺️ Route click tracked: ${businessName}`);
    } catch (err) {
        // Silently fail - analytics shouldn't break the app
        logger.warn('[Analytics] Failed to track route click:', err);
    }
}


// ============================================
// DEVICE ID PERSISTENTE + SESSION ID
// ============================================

/**
 * Device ID persistente (sobrevive reinicios del navegador)
 * Permite calcular usuarios únicos reales y retención
 */
const getOrCreateDeviceId = () => {
    const DEVICE_KEY = 'gb_device_id';
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
        id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
};

// Generar o recuperar session ID
const getSessionId = () => {
    let sessionId = sessionStorage.getItem('gb_session_id');
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('gb_session_id', sessionId);
    }
    return sessionId;
};

// Detectar tipo de dispositivo
const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
};

// Detectar navegador
const getBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Other';
};

// Detectar OS
const getAppVersion = () => {
    try {
        return localStorage.getItem('gb_app_version') || 'unknown';
    } catch {
        return 'unknown';
    }
};

const getRuntimePlatform = () => {
    try {
        return getPlatform();
    } catch {
        return 'web';
    }
};

const getOS = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
};

/**
 * Registrar visita a página
 */
export async function trackPageView(pagePath, pageTitle = document.title) {
    try {
        const attribution = getCurrentAttribution();
        const firstTouch = getFirstTouchAttribution();
        const fullPayload = {
            page_path: pagePath,
            page_title: pageTitle,
            referrer: document.referrer || null,
            user_id: (await supabase.auth.getUser())?.data?.user?.id || null,
            session_id: getSessionId(),
            country: localStorage.getItem('userCountry') || null,
            country_code: localStorage.getItem('userCountryCode') || null,
            city: localStorage.getItem('userCity') || null,
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            platform: getRuntimePlatform(),
            app_version: getAppVersion(),
            traffic_source: attribution?.utm_source || null,
            traffic_medium: attribution?.utm_medium || null,
            traffic_campaign: attribution?.utm_campaign || null,
            channel_group: attribution?.channel_group || 'direct',
            language: localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es',
            landing_path: attribution?.landing_path || pagePath,
            attribution_snapshot: {
                current: attribution,
                first_touch: firstTouch
            }
        };

        const fallbackPayload = {
            page_path: fullPayload.page_path,
            page_title: fullPayload.page_title,
            referrer: fullPayload.referrer,
            user_id: fullPayload.user_id,
            session_id: fullPayload.session_id,
            country: fullPayload.country,
            country_code: fullPayload.country_code,
            city: fullPayload.city,
            device_type: fullPayload.device_type,
            browser: fullPayload.browser,
            os: fullPayload.os
        };

        const { error } = await insertWithOptionalColumns('page_analytics', fullPayload, fallbackPayload);

        if (error) {
            logger.error('[Analytics] Error tracking page view:', error);
        } else {
            logger.dev(`📊 Page view tracked: ${pagePath}`);
        }
    } catch (err) {
        // Silently fail - analytics shouldn't break the app
        console.warn('[Analytics] Failed to track:', err);
    }
}

/**
 * Registrar búsqueda
 */
export async function trackSearch(query, options = {}) {
    try {
        const attribution = getCurrentAttribution();
        const firstTouch = getFirstTouchAttribution();
        const {
            category = null,
            subcategory = null,
            resultsCount = 0,
            userLat = null,
            userLng = null
        } = options;

        const fullPayload = {
            query,
            category,
            subcategory,
            results_count: resultsCount,
            user_lat: userLat,
            user_lng: userLng,
            country: localStorage.getItem('userCountry') || null,
            city: localStorage.getItem('userCity') || null,
            traffic_source: attribution?.utm_source || null,
            traffic_medium: attribution?.utm_medium || null,
            traffic_campaign: attribution?.utm_campaign || null,
            channel_group: attribution?.channel_group || 'direct',
            language: localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es',
            attribution_snapshot: {
                current: attribution,
                first_touch: firstTouch
            }
        };

        const fallbackPayload = {
            query: fullPayload.query,
            category: fullPayload.category,
            subcategory: fullPayload.subcategory,
            results_count: fullPayload.results_count,
            user_lat: fullPayload.user_lat,
            user_lng: fullPayload.user_lng,
            country: fullPayload.country,
            city: fullPayload.city
        };

        const { error } = await insertWithOptionalColumns('search_analytics', fullPayload, fallbackPayload);

        if (error) {
            logger.error('[Analytics] Error tracking search:', error);
        } else {
            logger.dev(`🔍 Search tracked: "${query}" (${resultsCount} results)`);
        }
    } catch (err) {
        console.warn('[Analytics] Failed to track search:', err);
    }
}

/**
 * Registrar click en resultado de búsqueda
 */
export async function trackSearchClick(searchId, businessId) {
    try {
        await supabase
            .from('search_analytics')
            .update({ clicked_result_id: businessId })
            .eq('id', searchId);
    } catch (err) {
        console.warn('[Analytics] Failed to track search click:', err);
    }
}

/**
 * Obtener estadísticas para el Dashboard Admin
 */
export async function getAnalyticsSummary(days = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();

        // Page views
        const { count: pageViews } = await supabase
            .from('page_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDateStr);

        // Unique visitors (by session)
        const { data: sessionsData } = await supabase
            .from('page_analytics')
            .select('session_id')
            .gte('created_at', startDateStr);
        const uniqueVisitors = new Set(sessionsData?.map(s => s.session_id) || []).size;

        // Searches
        const { count: searches } = await supabase
            .from('search_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDateStr);

        // Today's stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStr = todayStart.toISOString();

        const { count: todayPageViews } = await supabase
            .from('page_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStr);

        const { count: todaySearches } = await supabase
            .from('search_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStr);

        return {
            pageViews: pageViews || 0,
            uniqueVisitors,
            searches: searches || 0,
            todayPageViews: todayPageViews || 0,
            todaySearches: todaySearches || 0,
            period: days
        };
    } catch (err) {
        console.error('[Analytics] Error getting summary:', err);
        return {
            pageViews: 0,
            uniqueVisitors: 0,
            searches: 0,
            todayPageViews: 0,
            todaySearches: 0,
            period: days
        };
    }
}

/**
 * Obtener tráfico por hora (últimos N días)
 */
export async function getHourlyTraffic(days = 7) {
    try {
        const { data, error } = await supabase.rpc('get_hourly_analytics', { p_days: days });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[Analytics] Error getting hourly traffic:', err);
        return [];
    }
}

/**
 * Obtener tráfico por país
 */
export async function getCountryTraffic(days = 30) {
    try {
        const { data, error } = await supabase.rpc('get_country_analytics', { p_days: days });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[Analytics] Error getting country traffic:', err);
        return [];
    }
}

/**
 * Obtener búsquedas más populares
 */
export async function getTopSearches(limit = 10, days = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('search_analytics')
            .select('query')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        // Count occurrences
        const counts = {};
        data?.forEach(item => {
            const q = item.query?.toLowerCase().trim();
            if (q) counts[q] = (counts[q] || 0) + 1;
        });

        // Sort and return top N
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query, count]) => ({ query, count }));
    } catch (err) {
        console.error('[Analytics] Error getting top searches:', err);
        return [];
    }
}

/**
 * Obtener dispositivos más usados
 */
export async function getDeviceBreakdown(days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('page_analytics')
            .select('device_type')
            .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const counts = { desktop: 0, mobile: 0, tablet: 0 };
        data?.forEach(item => {
            if (counts[item.device_type] !== undefined) {
                counts[item.device_type]++;
            }
        });

        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(counts).map(([device, count]) => ({
            device,
            count,
            percentage: Math.round((count / total) * 100)
        }));
    } catch (err) {
        console.error('[Analytics] Error getting device breakdown:', err);
        return [];
    }
}

/**
 * Trackear signup de usuario
 * CRÍTICO: Registra cuando un usuario se registra (email, Google, Apple)
 */
export async function trackUserSignup(userId, method = 'email', metadata = {}) {
    // GA4 tracking
    trackEvent('sign_up', {
        method: method,
        user_id: userId
    });

    // Supabase tracking (para dashboard admin)
    try {
        const attribution = getCurrentAttribution();
        const fullPayload = {
            user_id: userId,
            session_type: `signup_${method}`,
            referral_source: metadata.referralCode || getAttributionSummary() || null,
            country: localStorage.getItem('userCountry'),
            city: localStorage.getItem('userCity'),
            language: localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es',
            traffic_source: attribution?.utm_source || null,
            traffic_medium: attribution?.utm_medium || null,
            traffic_campaign: attribution?.utm_campaign || null,
            platform: getRuntimePlatform(),
            app_version: getAppVersion(),
            os: getOS(),
            device_type: getDeviceType(),
            attribution_snapshot: {
                current: attribution,
                first_touch: getFirstTouchAttribution()
            }
        };

        const fallbackPayload = {
            user_id: fullPayload.user_id,
            session_type: fullPayload.session_type,
            referral_source: fullPayload.referral_source,
            country: fullPayload.country,
            city: fullPayload.city
        };

        await insertWithOptionalColumns('user_sessions', fullPayload, fallbackPayload);
        await updateUserGrowthProfile(userId, 'signup');
        logger.success(`✅ User signup tracked: ${userId} (${method})`);
    } catch (err) {
        logger.warn('[Analytics] Failed to track signup:', err);
    }
}

/**
 * Trackear login de usuario
 * CRÍTICO: Registra cuando un usuario inicia sesión
 */
export async function updateUserGrowthProfile(userId, eventType = 'login') {
    if (!userId) return;

    try {
        const attribution = getCurrentAttribution();
        const platform = getRuntimePlatform();
        const payload = {
            id: userId,
            last_seen_at: new Date().toISOString(),
            last_seen_platform: platform,
            last_seen_source: attribution?.utm_source || getAttributionSummary() || 'direct',
            updated_at: new Date().toISOString()
        };

        if (eventType === 'signup') {
            payload.registration_platform = platform;
            payload.registration_source = attribution?.utm_source || getAttributionSummary() || 'direct';
            payload.registration_app_version = getAppVersion();
        }

        if (eventType === 'login') {
            payload.last_login_at = new Date().toISOString();
            payload.last_login_platform = platform;
            payload.last_login_source = attribution?.utm_source || getAttributionSummary() || 'direct';
        }

        await supabase.from('user_profiles').upsert(payload, { onConflict: 'id', ignoreDuplicates: false });
    } catch (err) {
        logger.warn('[Analytics] Failed to update growth profile:', err);
    }
}

/**
 * Trackear login de usuario
 * CRITICO: Registra cuando un usuario inicia sesion
 */
export async function trackUserLogin(userId, method = 'email') {
    // GA4 tracking
    trackEvent('login', {
        method: method,
        user_id: userId
    });

    // Supabase tracking
    try {
        const attribution = getCurrentAttribution();
        const fullPayload = {
            user_id: userId,
            session_type: `login_${method}`,
            country: localStorage.getItem('userCountry'),
            city: localStorage.getItem('userCity'),
            referral_source: getAttributionSummary() || null,
            language: localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es',
            traffic_source: attribution?.utm_source || null,
            traffic_medium: attribution?.utm_medium || null,
            traffic_campaign: attribution?.utm_campaign || null,
            platform: getRuntimePlatform(),
            app_version: getAppVersion(),
            os: getOS(),
            device_type: getDeviceType(),
            attribution_snapshot: {
                current: attribution,
                first_touch: getFirstTouchAttribution()
            }
        };

        const fallbackPayload = {
            user_id: fullPayload.user_id,
            session_type: fullPayload.session_type,
            country: fullPayload.country,
            city: fullPayload.city,
            referral_source: fullPayload.referral_source
        };

        await insertWithOptionalColumns('user_sessions', fullPayload, fallbackPayload);
        await updateUserGrowthProfile(userId, 'login');
        logger.success(`✅ User login tracked: ${userId} (${method})`);
    } catch (err) {
        logger.warn('[Analytics] Failed to track login:', err);
    }
}

// ============================================
// COLA OFFLINE PARA EVENTOS
// ============================================

const QUEUE_KEY = 'gb_event_queue';

/**
 * Encola un evento para enviar después (cuando no hay internet)
 */
function queueIntentEvent(eventData) {
    try {
        const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        q.push({ ...eventData, queued_at: new Date().toISOString() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
        logger.dev(`📦 Event queued offline: ${eventData.event_name}`);
    } catch (err) {
        console.warn('[Analytics] Failed to queue event:', err);
    }
}

/**
 * Envía todos los eventos encolados (llamar cuando vuelva el internet)
 */
export async function flushEventQueue() {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!q.length || !navigator.onLine) return;

    const remaining = [];
    for (const ev of q) {
        try {
            const { queued_at, ...data } = ev;
            const { error } = await supabase.from('business_intent_logs').insert(data);
            if (error) {
                remaining.push(ev);
            } else {
                logger.dev(`✅ Flushed queued event: ${data.event_name}`);
            }
        } catch {
            remaining.push(ev);
        }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
        logger.success(`📤 All ${q.length} queued events flushed successfully`);
    } else {
        logger.warn(`📤 Flushed ${q.length - remaining.length}/${q.length} events, ${remaining.length} remaining`);
    }
}

// ============================================
// TRACKING DE INTENCIÓN DE NEGOCIO (vendible)
// ============================================

/**
 * Inserta un evento de intención en business_intent_logs
 * Con cola offline automática si no hay red
 */
async function trackIntentEvent(eventName, businessId, businessName, extra = {}) {
    // Validar si businessId es un UUID válido.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);
    const validBusinessId = isUuid ? businessId : null;

    const eventData = {
        event_name: eventName,
        business_id: validBusinessId,
        device_id: getOrCreateDeviceId(),
        session_id: getSessionId(),
        user_id: (await supabase.auth.getUser())?.data?.user?.id || null,
        platform: extra.platform || 'web',
        city: localStorage.getItem('userCity') || null,
        metadata: {
            business_name: businessName || null,
            business_category: extra.category || null,
            source: extra.source || 'business_profile',
            country: localStorage.getItem('userCountry') || null,
            country_code: localStorage.getItem('userCountryCode') || null,
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            original_business_id: businessId || null,
            attribution: getCurrentAttribution(),
            first_touch_attribution: getFirstTouchAttribution(),
            channel_group: getCurrentAttribution()?.channel_group || 'direct',
            language: localStorage.getItem('language') || document.documentElement.lang || navigator.language || 'es',
            ...(extra.metadata || {})
        }
    };

    // GA4 tracking (dual)
    trackEvent(eventName, {
        business_id: businessId,
        business_name: businessName,
        source: extra.source || 'business_profile'
    });

    // Si estamos offline, encolar
    if (!navigator.onLine) {
        queueIntentEvent(eventData);
        return;
    }

    try {
        const { error } = await supabase.from('business_intent_logs').insert(eventData);
        if (error) {
            logger.warn(`[Analytics] Error inserting ${eventName}:`, error);
            queueIntentEvent(eventData);
        } else {
            logger.dev(`📊 Intent tracked: ${eventName} → ${businessName}`);
        }
    } catch (err) {
        queueIntentEvent(eventData);
    }
}

/**
 * Trackear click en WhatsApp
 */
export async function trackWhatsAppClick(businessId, businessName, source = 'business_profile') {
    return trackIntentEvent('tap_whatsapp', businessId, businessName, { source });
}

/**
 * Trackear click en Llamar
 */
export async function trackCallClick(businessId, businessName, source = 'business_profile') {
    return trackIntentEvent('tap_call', businessId, businessName, { source });
}

/**
 * Trackear click en Direcciones / Cómo llegar
 */
export async function trackDirectionsClick(businessId, businessName, source = 'business_profile') {
    return trackIntentEvent('open_directions', businessId, businessName, { source });
}

/**
 * Trackear Compartir negocio
 */
export async function trackShareBusiness(businessId, businessName, platform = 'native') {
    return trackIntentEvent('share_business', businessId, businessName, {
        source: 'business_profile',
        metadata: { share_platform: platform }
    });
}

/**
 * Trackear vista de perfil de negocio (KPI vendible)
 * Registra cada vez que un usuario abre el perfil de un negocio
 */
export async function trackBusinessProfileView(businessId, businessName, source = 'direct') {
    return trackIntentEvent('view_business_profile', businessId, businessName, { source });
}

/**
 * Trackear Guardar en favoritos
 */
export async function trackSaveFavorite(businessId, businessName) {
    return trackIntentEvent('save_favorite', businessId, businessName);
}

export async function trackBusinessCreated(businessId, businessName, extra = {}) {
    return trackIntentEvent('business_created', businessId, businessName, {
        source: 'business_form',
        metadata: extra
    });
}

export async function trackTopBusinessesClick(context = {}) {
    trackEvent('top_businesses_click', context);
}

export async function trackMichelinCampaignClick(context = {}) {
    trackEvent('michelin_campaign_click', context);
}

/**
 * Trackear inicio de reclamo de negocio
 * KPI: Mide cuántos usuarios inician el proceso de reclamar un negocio
 */
export async function trackClaimBusinessStart(businessId, businessName, sourceType = 'native') {
    return trackIntentEvent('claim_business_start', businessId, businessName, {
        source: 'claim_page',
        metadata: { source_type: sourceType }
    });
}

/**
 * Trackear reclamo de negocio completado
 * KPI: Mide cuántos reclamos se envían exitosamente
 */
export async function trackClaimBusinessComplete(businessId, businessName) {
    return trackIntentEvent('claim_business_complete', businessId, businessName, {
        source: 'claim_page'
    });
}

/**
 * Trackear impresión de recomendaciones de IA
 * KPI: Mide cuántas veces se carga el módulo de IA
 */
export async function trackAIRecommendationShown(businessCount) {
    return trackIntentEvent('ai_recommendation_shown', 'system', 'AI Module', {
        source: 'home_page',
        metadata: { business_count: businessCount }
    });
}

/**
 * Trackear click en recomendación de IA
 * KPI: Mide engagement de las recomendaciones
 */
export async function trackAIRecommendationClick(businessId, businessName) {
    return trackIntentEvent('ai_recommendation_click', businessId, businessName, {
        source: 'ai_recommendations'
    });
}

/**
 * Obtener Device ID actual (para componentes que lo necesiten)
 */
export { getOrCreateDeviceId };
