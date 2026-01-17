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

// Component to activate session timeout monitoring
function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

// Component to initialize app (cache clearing, analytics)
function AppInitializer() {
  useEffect(() => {
    // 1. Verificar versión y limpiar caché si es necesario
    checkAppVersion();

    // 2. Inicializar GA4
    initializeGA4();
    trackSessionStart(false);
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
