// src/services/analyticsService.js
/**
 * Servicio de Analytics Interno para Geobooker
 * Registra eventos de usuario en Supabase para KPIs en tiempo real
 */
import { supabase } from '../lib/supabase';

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
        const { error } = await supabase.from('page_analytics').insert({
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
            os: getOS()
        });

        if (error) {
            console.error('[Analytics] Error tracking page view:', error);
        } else {
            console.log(`📊 [Analytics] Page view tracked: ${pagePath}`);
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
        const {
            category = null,
            subcategory = null,
            resultsCount = 0,
            userLat = null,
            userLng = null
        } = options;

        const { error } = await supabase.from('search_analytics').insert({
            query,
            category,
            subcategory,
            results_count: resultsCount,
            user_lat: userLat,
            user_lng: userLng,
            country: localStorage.getItem('userCountry') || null,
            city: localStorage.getItem('userCity') || null
        });

        if (error) {
            console.error('[Analytics] Error tracking search:', error);
        } else {
            console.log(`🔍 [Analytics] Search tracked: "${query}" (${resultsCount} results)`);
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
