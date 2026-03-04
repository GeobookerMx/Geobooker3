// src/utils/platformDetection.js
/**
 * Platform detection utilities for Geobooker
 * Used to determine if we're running in iOS app (Capacitor), PWA, or browser
 * Critical for ATT/tracking gating on iOS
 */

/**
 * Detect if running inside Capacitor (native iOS/Android app)
 */
export const isCapacitorApp = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform !== undefined &&
        window.Capacitor.isNativePlatform();
};

/**
 * Detect if running on iOS (any context: browser, PWA, or native)
 */
export const isIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detect if running as iOS native app (Capacitor on iOS)
 */
export const isIOSApp = () => {
    return isCapacitorApp() && isIOS();
};

/**
 * Detect if running in standalone/PWA mode
 */
export const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
};

/**
 * Detect if running on Android
 */
export const isAndroid = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
};

/**
 * Get current platform string
 * @returns {'ios-native' | 'android-native' | 'ios-pwa' | 'android-pwa' | 'ios-browser' | 'android-browser' | 'desktop'}
 */
export const getPlatform = () => {
    if (isCapacitorApp()) {
        return isIOS() ? 'ios-native' : 'android-native';
    }
    if (isStandalone()) {
        return isIOS() ? 'ios-pwa' : isAndroid() ? 'android-pwa' : 'desktop';
    }
    if (isIOS()) return 'ios-browser';
    if (isAndroid()) return 'android-browser';
    return 'desktop';
};

/**
 * Check if tracking requires ATT permission (iOS 14.5+)
 * In iOS native app context, tracking must be gated behind ATT
 */
export const requiresATT = () => {
    return isIOSApp();
};

/**
 * Check if we should show GDPR cookie consent (web/PWA)
 * On iOS native app, we use ATT instead of cookie consent
 */
export const shouldShowCookieConsent = () => {
    return !isIOSApp();
};
