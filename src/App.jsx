// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { trackSessionStart } from "./services/analyticsService";
import { flushEventQueue } from "./services/analyticsService";
import { initTrackingFromConsent } from "./services/trackingService";
import { detectUserCountry } from "./services/geoLocationService";
import { usePageTracking } from "./hooks/usePageTracking";
import i18n from "./i18n";

import AppRouter from "./router";
import ChatWidget from "./components/agent/ChatWidget";
import { checkAppVersion } from "./services/cacheVersionService";
import InstallPWAButton from "./components/common/InstallPWAButton";
import DownloadAppModal from "./components/pwa/DownloadAppModal";
import ScrollToTop from "./components/common/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import { Toaster } from "react-hot-toast";

// Component to active session timeout monitoring
function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

// Component to track page views
function PageTracker() {
  usePageTracking();
  return null;
}

function AppInitializer() {
  useEffect(() => {
    // 1. Verificar versión y limpiar caché si es necesario
    checkAppVersion();

    // 2. Initialize tracking (only loads if user previously consented)
    // Apple 5.1.2(i): NO tracking before consent/ATT
    initTrackingFromConsent();
    trackSessionStart(false);

    // 2b. Flush offline event queue (enviar eventos encolados)
    flushEventQueue();
    const handleOnline = () => flushEventQueue();
    window.addEventListener('online', handleOnline);

    // 3. Detectar país por IP para moneda y SEO (Background)
    const initGeo = async () => {
      const geoData = await detectUserCountry();
      if (geoData) {
        localStorage.setItem('userCountryCode', geoData.country);
        localStorage.setItem('userCountryName', geoData.countryName);
        localStorage.setItem('userCity', geoData.city);

        // 4. Cambiar idioma automáticamente si NO hay preferencia guardada ya
        // ⚠️ NO auto-cambiar idioma si estamos en .com.mx o en Capacitor nativo
        // porque el dominio ya define el idioma correcto (es) en i18n.js
        const isComMx = window.location.hostname.endsWith('geobooker.com.mx');
        const isCapacitor = window.Capacitor?.isNativePlatform?.();
        const savedLang = localStorage.getItem('language');
        if (!savedLang && !isComMx && !isCapacitor) {
          const country = geoData.country;
          let newLang = null;

          if (country === 'FR') newLang = 'fr';
          else if (['CN', 'HK', 'TW'].includes(country)) newLang = 'zh';
          else if (['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'GT', 'PR'].includes(country)) newLang = 'es';
          else if (['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'IT', 'NL', 'BE', 'SE', 'NO', 'FI', 'DK'].includes(country)) newLang = 'en';

          if (newLang && i18n.language !== newLang) {
            console.log(`🌐 Cambiando idioma automáticamente a ${newLang} para el país ${country}`);
            i18n.changeLanguage(newLang);
          }
        }
      }
    };
    initGeo();

    return () => window.removeEventListener('online', handleOnline);
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Toaster position="top-right" />
        <SessionTimeoutMonitor />
        <AppInitializer />
        <PageTracker />
        <AppProvider>
          <LocationProvider>
            <AppRouter />
            {/* Asistente AI flotante */}
            <ChatWidget />
            {/* Banner de instalación PWA */}
            <InstallPWAButton variant="banner" />
            {/* Modal de descarga de app */}
            <DownloadAppModal />
            {/* GDPR Cookie Consent Banner */}
            <CookieConsent />
          </LocationProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
