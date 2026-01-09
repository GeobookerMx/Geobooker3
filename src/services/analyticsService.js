// src/services/analyticsService.js
/**
 * Servicio de Analytics Interno - Geobooker
 * Trackea visitas, búsquedas y comportamiento del usuario
 */

import { supabase } from '../lib/supabase';

// Generar o recuperar session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('geo_session_id');
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('geo_session_id', sessionId);
    }
    return sessionId;
}

// Detectar tipo de dispositivo
function getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

// Detectar navegador
function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Other';
}

// Detectar sistema operativo
function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
}

/**
 * Trackear evento genérico (para GA4 y Supabase)
 * @param {string} eventName - Nombre del evento
 * @param {Object} eventParams - Parámetros del evento
 */
export function trackEvent(eventName, eventParams = {}) {
    try {
        // Enviar a Google Analytics 4
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', eventName, eventParams);
        }

        // Log para debug
        console.log(`📊 Event: ${eventName}`, eventParams);
    } catch (e) {
        console.warn('Track event error:', e);
    }
}

/**
 * Inicializa GA4 (llamado desde App.jsx)
 * Ya está configurado en index.html, esto es para compatibilidad
 */
export function initializeGA4() {
    console.log('📊 GA4 initialized via index.html');
}

/**
 * Trackea inicio de sesión del usuario
 */
export function trackSessionStart() {
    try {
        const sessionId = getSessionId();
        trackEvent('session_start', {
            session_id: sessionId,
            device: getDeviceType(),
            browser: getBrowser(),
            os: getOS()
        });
    } catch (e) {
        console.warn('Session start tracking error:', e);
    }
}

/**
 * Trackea clic en botón de ruta/navegación
 */
export function trackRouteClick(businessId, businessName) {
    trackEvent('route_click', {
        business_id: businessId,
        business_name: businessName,
        timestamp: new Date().toISOString()
    });
}

/**
 * Trackea vista de un negocio
 */
export function trackBusinessView(businessId, businessName) {
    trackEvent('business_view', {
        business_id: businessId,
        business_name: businessName,
        timestamp: new Date().toISOString()
    });
}

/**
 * Trackear visita a página
 * @param {string} pagePath - Ruta de la página
 * @param {string} pageTitle - Título de la página
 */
export async function trackPageView(pagePath, pageTitle = document.title) {
    try {
        const sessionId = getSessionId();

        // Obtener ubicación del usuario (si está disponible)
        const country = localStorage.getItem('userCountry') || null;
        const city = localStorage.getItem('userCity') || null;
        const countryCode = localStorage.getItem('userCountryCode') || null;

        // Obtener user ID si está autenticado
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('page_analytics').insert({
            page_path: pagePath,
            page_title: pageTitle,
            referrer: document.referrer || null,
            user_id: user?.id || null,
            session_id: sessionId,
            country: country,
            country_code: countryCode,
            city: city,
            device_type: getDeviceType(),
            browser: getBrowser(),
            os: getOS()
        });

        if (error) {
            console.warn('Analytics tracking error:', error.message);
        }
    } catch (e) {
        // Silenciar errores de analytics para no afectar UX
        console.warn('Analytics error:', e);
    }
}

/**
 * Trackear búsqueda realizada
 * @param {Object} searchData - Datos de la búsqueda
 */
export async function trackSearch(searchData) {
    try {
        const { query, category, subcategory, resultsCount, userLat, userLng } = searchData;

        const country = localStorage.getItem('userCountry') || null;
        const city = localStorage.getItem('userCity') || null;

        const { error } = await supabase.from('search_analytics').insert({
            query: query || '',
            category: category || null,
            subcategory: subcategory || null,
            results_count: resultsCount || 0,
            user_lat: userLat || null,
            user_lng: userLng || null,
            country: country,
            city: city
        });

        if (error) {
            console.warn('Search analytics error:', error.message);
        }
    } catch (e) {
        console.warn('Search analytics error:', e);
    }
}

/**
 * Trackear clic en resultado de búsqueda
 * @param {string} businessId - ID del negocio clickeado
 */
export async function trackResultClick(businessId) {
    // Esto se puede expandir más adelante
    console.log('Result clicked:', businessId);
}

// ============================================
// FUNCIONES PARA ADMIN DASHBOARD
// ============================================

/**
 * Obtener estadísticas por hora (24hrs)
 * @param {number} days - Días a consultar
 */
export async function getHourlyAnalytics(days = 7) {
    try {
        const { data, error } = await supabase.rpc('get_hourly_analytics', {
            p_days: days
        });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Error fetching hourly analytics:', e);
        // Retornar datos demo si falla
        return generateDemoHourlyData();
    }
}

/**
 * Obtener tráfico por país
 * @param {number} days - Días a consultar
 */
export async function getCountryAnalytics(days = 30) {
    try {
        const { data, error } = await supabase.rpc('get_country_analytics', {
            p_days: days
        });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Error fetching country analytics:', e);
        // Retornar datos demo si falla
        return generateDemoCountryData();
    }
}

/**
 * Obtener resumen general de analytics
 */
export async function getAnalyticsSummary(days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Total page views
        const { count: pageViews } = await supabase
            .from('page_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());

        // Total searches
        const { count: searches } = await supabase
            .from('search_analytics')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString());

        // Unique sessions
        const { data: sessions } = await supabase
            .from('page_analytics')
            .select('session_id')
            .gte('created_at', startDate.toISOString());

        const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []).size;

        return {
            pageViews: pageViews || 0,
            searches: searches || 0,
            uniqueVisitors: uniqueSessions,
            avgPagesPerSession: uniqueSessions > 0 ? Math.round((pageViews || 0) / uniqueSessions * 10) / 10 : 0
        };
    } catch (e) {
        console.error('Error fetching analytics summary:', e);
        return {
            pageViews: 0,
            searches: 0,
            uniqueVisitors: 0,
            avgPagesPerSession: 0
        };
    }
}

// ============================================
// DATOS DEMO (fallback si no hay datos reales)
// ============================================

function generateDemoHourlyData() {
    const hours = [];
    for (let i = 0; i < 24; i++) {
        // Simular picos en horarios típicos
        let multiplier = 1;
        if (i >= 12 && i <= 14) multiplier = 2.5;  // Lunch peak
        if (i >= 20 && i <= 22) multiplier = 2.2;  // Evening peak
        if (i >= 0 && i <= 5) multiplier = 0.2;    // Night low
        if (i >= 8 && i <= 10) multiplier = 1.5;   // Morning

        hours.push({
            hour: i,
            page_views: Math.round(50 * multiplier + Math.random() * 30),
            searches: Math.round(20 * multiplier + Math.random() * 15),
            unique_visitors: Math.round(30 * multiplier + Math.random() * 20)
        });
    }
    return hours;
}

function generateDemoCountryData() {
    return [
        { country: 'México', country_code: 'MX', page_views: 4500, searches: 1200, percentage: 65.5 },
        { country: 'Estados Unidos', country_code: 'US', page_views: 1200, searches: 350, percentage: 17.4 },
        { country: 'España', country_code: 'ES', page_views: 450, searches: 120, percentage: 6.5 },
        { country: 'Colombia', country_code: 'CO', page_views: 320, searches: 85, percentage: 4.7 },
        { country: 'Argentina', country_code: 'AR', page_views: 280, searches: 70, percentage: 4.1 },
        { country: 'Otros', country_code: 'XX', page_views: 120, searches: 30, percentage: 1.8 }
    ];
}
