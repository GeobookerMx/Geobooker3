// src/services/analyticsService.js
/**
 * Google Analytics 4 Integration for Geobooker
 * Tracks key events for demonstrating platform value to advertisers
 */

// GA4 Measurement ID - will be set in environment
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Initialize GA4
export function initializeGA4() {
    if (typeof window === 'undefined') return;

    // Skip in development if no ID configured
    if (GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
        console.log('📊 GA4: Running in development mode (no tracking)');
        return;
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
    });

    console.log('📊 GA4 Initialized:', GA_MEASUREMENT_ID);
}

/**
 * Track custom event
 * @param {string} eventName - Name of the event
 * @param {Object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
    if (typeof window === 'undefined' || !window.gtag) {
        console.log(`📊 [DEV] Event: ${eventName}`, params);
        return;
    }

    window.gtag('event', eventName, {
        ...params,
        timestamp: new Date().toISOString()
    });

    console.log(`📊 Event tracked: ${eventName}`, params);
}

// ============================================
// BUSINESS SEARCH EVENTS
// ============================================

/**
 * Track when user performs a search
 */
export function trackSearch(searchTerm, resultsCount, userLocation = null) {
    trackEvent('search_business', {
        search_term: searchTerm,
        results_count: resultsCount,
        has_location: !!userLocation,
        user_lat: userLocation?.lat,
        user_lng: userLocation?.lng
    });
}

/**
 * Track when user views a business profile
 */
export function trackBusinessView(businessId, businessName, businessCategory, source = 'map') {
    trackEvent('view_business', {
        business_id: businessId,
        business_name: businessName,
        business_category: businessCategory,
        source: source // 'map', 'search', 'recommendation', 'ad'
    });
}

// ============================================
// CONVERSION EVENTS (High Value)
// ============================================

/**
 * Track click on WhatsApp button
 */
export function trackWhatsAppClick(businessId, businessName) {
    trackEvent('click_whatsapp', {
        business_id: businessId,
        business_name: businessName,
        conversion_type: 'lead'
    });
}

/**
 * Track click on Phone call button
 */
export function trackPhoneClick(businessId, businessName) {
    trackEvent('click_call', {
        business_id: businessId,
        business_name: businessName,
        conversion_type: 'lead'
    });
}

/**
 * Track click on Route/Directions button
 */
export function trackRouteClick(businessId, businessName) {
    trackEvent('click_route', {
        business_id: businessId,
        business_name: businessName,
        conversion_type: 'intent'
    });
}

/**
 * Track click on business website
 */
export function trackWebsiteClick(businessId, businessName, websiteUrl) {
    trackEvent('click_website', {
        business_id: businessId,
        business_name: businessName,
        website_url: websiteUrl,
        conversion_type: 'lead'
    });
}

// ============================================
// ADVERTISING EVENTS
// ============================================

/**
 * Track ad impression
 */
export function trackAdImpression(campaignId, slotType, advertiserName) {
    trackEvent('ad_impression', {
        campaign_id: campaignId,
        slot_type: slotType,
        advertiser_name: advertiserName
    });
}

/**
 * Track ad click
 */
export function trackAdClick(campaignId, slotType, advertiserName, destinationUrl) {
    trackEvent('ad_click', {
        campaign_id: campaignId,
        slot_type: slotType,
        advertiser_name: advertiserName,
        destination_url: destinationUrl,
        conversion_type: 'ad_engagement'
    });
}

// ============================================
// USER ENGAGEMENT EVENTS
// ============================================

/**
 * Track user registration
 */
export function trackUserSignup(method = 'email') {
    trackEvent('sign_up', {
        method: method // 'email', 'google', 'facebook'
    });
}

/**
 * Track business registration
 */
export function trackBusinessRegistration(category) {
    trackEvent('business_registration', {
        category: category
    });
}

/**
 * Track premium upgrade
 */
export function trackPremiumUpgrade(planType, price) {
    trackEvent('purchase', {
        transaction_id: `premium_${Date.now()}`,
        value: price,
        currency: 'MXN',
        items: [{
            item_name: planType,
            item_category: 'premium_subscription'
        }]
    });
}

/**
 * Track ad campaign purchase
 */
export function trackAdPurchase(campaignId, slotType, price, isPilot = false) {
    trackEvent('purchase', {
        transaction_id: `ad_${campaignId}`,
        value: price,
        currency: 'MXN',
        items: [{
            item_name: slotType,
            item_category: isPilot ? 'ad_pilot' : 'ad_campaign'
        }]
    });
}

// ============================================
// PAGE VIEW & SESSION TRACKING
// ============================================

/**
 * Track page view (called automatically by router)
 */
export function trackPageView(pagePath, pageTitle) {
    trackEvent('page_view', {
        page_path: pagePath,
        page_title: pageTitle
    });
}

/**
 * Track session start with user context
 */
export function trackSessionStart(isLoggedIn, isPremium = false) {
    trackEvent('session_start', {
        is_logged_in: isLoggedIn,
        is_premium: isPremium,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        language: navigator.language
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Set user properties for segmentation
 */
export function setUserProperties(userId, properties = {}) {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('set', 'user_properties', {
        user_id: userId,
        ...properties
    });
}

/**
 * Get session ID for deduplication
 */
export function getSessionId() {
    let sessionId = sessionStorage.getItem('gb_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('gb_session_id', sessionId);
    }
    return sessionId;
}

export default {
    initializeGA4,
    trackEvent,
    trackSearch,
    trackBusinessView,
    trackWhatsAppClick,
    trackPhoneClick,
    trackRouteClick,
    trackWebsiteClick,
    trackAdImpression,
    trackAdClick,
    trackUserSignup,
    trackBusinessRegistration,
    trackPremiumUpgrade,
    trackAdPurchase,
    trackPageView,
    trackSessionStart,
    setUserProperties,
    getSessionId
};
