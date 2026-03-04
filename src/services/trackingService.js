// src/services/trackingService.js
/**
 * Tracking Service for Geobooker
 * 
 * CRITICAL FOR APP STORE COMPLIANCE:
 * - NO tracking scripts are loaded in index.html
 * - GA4 and Clarity are injected dynamically ONLY after user consent
 * - On iOS native app: requires ATT permission before any tracking
 * - On web: requires GDPR cookie consent before tracking
 * 
 * Apple Guideline 5.1.2(i) compliance:
 * - Must NOT load tracking before ATT consent on iOS
 * - Must NOT set tracking cookies before consent
 */

import { isIOSApp } from '../utils/platformDetection';

// ============================================
// CONFIGURATION
// ============================================

const GA4_MEASUREMENT_ID = 'G-M1DRMN5LDG';
const CLARITY_PROJECT_ID = 'v1j8dut5lg';

// ============================================
// STATE
// ============================================

let trackingEnabled = false;
let trackingScriptsLoaded = false;

// ============================================
// SCRIPT INJECTION (Dynamic)
// ============================================

/**
 * Inject a script tag into the document head
 * @param {string} src - Script URL
 * @returns {Promise<void>}
 */
function injectScript(src) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * Inject inline script
 * @param {string} code - JavaScript code to execute
 * @param {string} id - Unique identifier for the script
 */
function injectInlineScript(code, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.textContent = code;
    document.head.appendChild(script);
}

// ============================================
// GA4 SETUP
// ============================================

/**
 * Initialize GA4 dataLayer and gtag function
 * MUST be called before loading gtag.js
 */
function initGtagBase() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer.push(arguments);
    };
}

/**
 * Load and configure Google Analytics 4
 */
async function loadGA4() {
    try {
        // Initialize dataLayer first
        initGtagBase();

        // Set consent to granted (user already accepted)
        window.gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        });

        // Load gtag.js
        await injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`);

        // Configure GA4
        window.gtag('js', new Date());
        window.gtag('config', GA4_MEASUREMENT_ID, {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true,
            anonymize_ip: true,
        });

        console.log('📊 GA4 loaded dynamically after consent');
    } catch (error) {
        console.warn('⚠️ Failed to load GA4:', error);
    }
}

// ============================================
// MICROSOFT CLARITY SETUP
// ============================================

/**
 * Load Microsoft Clarity for heatmaps & session recordings
 */
function loadClarity() {
    try {
        const clarityCode = `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${CLARITY_PROJECT_ID}");
        `;
        injectInlineScript(clarityCode, 'gb-clarity-script');
        console.log('🔍 Clarity loaded dynamically after consent');
    } catch (error) {
        console.warn('⚠️ Failed to load Clarity:', error);
    }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Enable all tracking (GA4 + Clarity)
 * Call this ONLY after user has given consent (cookie banner or ATT)
 * 
 * @param {Object} options
 * @param {boolean} options.analytics - Enable analytics tracking
 * @param {boolean} options.marketing - Enable marketing/ads tracking
 */
export async function enableTracking(options = { analytics: true, marketing: true }) {
    if (trackingEnabled && trackingScriptsLoaded) {
        console.log('📊 Tracking already enabled');
        return;
    }

    // On iOS native app, tracking should only be enabled after ATT authorization
    // This is enforced by the Capacitor ATT plugin — here we just load scripts
    if (isIOSApp()) {
        console.log('📱 iOS native app — tracking gated behind ATT');
    }

    trackingEnabled = true;

    if (!trackingScriptsLoaded) {
        // Load GA4
        if (options.analytics || options.marketing) {
            await loadGA4();
        }

        // Load Clarity (analytics only, not ads)
        if (options.analytics) {
            loadClarity();
        }

        trackingScriptsLoaded = true;
    }

    // Update consent state if gtag is available
    if (window.gtag) {
        window.gtag('consent', 'update', {
            analytics_storage: options.analytics ? 'granted' : 'denied',
            ad_storage: options.marketing ? 'granted' : 'denied',
            ad_user_data: options.marketing ? 'granted' : 'denied',
            ad_personalization: options.marketing ? 'granted' : 'denied',
        });
    }
}

/**
 * Disable tracking
 * Updates consent state to denied but doesn't remove already-loaded scripts
 */
export function disableTracking() {
    trackingEnabled = false;

    // Update consent to denied
    if (window.gtag) {
        window.gtag('consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
    }

    console.log('🚫 Tracking disabled');
}

/**
 * Check if tracking is currently allowed/enabled
 */
export function isTrackingAllowed() {
    return trackingEnabled;
}

/**
 * Initialize tracking from previously saved consent
 * Call this once on app startup (App.jsx or main.jsx)
 * 
 * If the user previously accepted cookies, this will re-enable tracking
 * without showing the consent banner again
 */
export function initTrackingFromConsent() {
    try {
        // On iOS native app, don't auto-enable — wait for ATT
        if (isIOSApp()) {
            console.log('📱 iOS native: skipping auto-init, waiting for ATT');
            return;
        }

        const savedConsent = localStorage.getItem('gb_cookie_consent');
        if (!savedConsent) {
            // No consent saved — initialize gtag base with denied defaults
            // This allows consent mode to work when the banner appears
            initGtagBase();
            window.gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500,
            });
            return;
        }

        const consent = JSON.parse(savedConsent);
        if (consent.analytics) {
            enableTracking({
                analytics: consent.analytics || false,
                marketing: consent.marketing || false,
            });
        } else {
            // User explicitly denied — set denied state
            initGtagBase();
            window.gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
            });
        }
    } catch (error) {
        console.warn('⚠️ Error initializing tracking from consent:', error);
    }
}
