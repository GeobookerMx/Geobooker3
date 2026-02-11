// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { initializeGA4, trackSessionStart } from "./services/analyticsService";

import AppRouter from "./router";
import ChatWidget from "./components/agent/ChatWidget";
import { checkAppVersion } from "./services/cacheVersionService";
import InstallPWAButton from "./components/common/InstallPWAButton";
import DownloadAppModal from "./components/pwa/DownloadAppModal";
import ScrollToTop from "./components/common/ScrollToTop";

// Component to active session timeout monitoring
function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

// Component to track page views
import { usePageTracking } from "./hooks/usePageTracking";
function PageTracker() {
  usePageTracking();
  return null;
}

// Component to initialize app (cache clearing, analytics, geo)
import { detectUserCountry } from "./services/geoLocationService";
import i18n from "./i18n";

function AppInitializer() {
  useEffect(() => {
    // 1. Verificar versión y limpiar caché si es necesario
    checkAppVersion();

    // 2. Inicializar GA4
    initializeGA4();
    trackSessionStart(false);

    // 3. Detectar país por IP para moneda y SEO (Background)
    const initGeo = async () => {
      const geoData = await detectUserCountry();
      if (geoData) {
        localStorage.setItem('userCountryCode', geoData.country);
        localStorage.setItem('userCountryName', geoData.countryName);
        localStorage.setItem('userCity', geoData.city);

        // 4. Cambiar idioma automáticamente si NO hay preferencia guardada ya
        const savedLang = localStorage.getItem('language');
        if (!savedLang) {
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
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
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
          </LocationProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
