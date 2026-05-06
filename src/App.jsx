// src/App.jsx
import React, { useEffect, Component } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

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

// ✅ FIX iPad/iOS: HashRouter en nativo (capacitor://) — BrowserRouter en web
// BrowserRouter falla en Capacitor porque usa HTML5 History API sobre file://
const isNative = Capacitor.isNativePlatform();
const Router = isNative ? HashRouter : BrowserRouter;

// ✅ Error Boundary global: captura errores silenciosos que causan pantalla blanca
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("🚨 App Error Boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: "20px",
          fontFamily: "system-ui, sans-serif", backgroundColor: "#f8fafc"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontSize: "20px", color: "#1e293b", marginBottom: "8px" }}>
            Error al cargar la app
          </h1>
          <p style={{ color: "#64748b", marginBottom: "20px", textAlign: "center" }}>
            {this.state.error?.message || "Error desconocido"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#2563eb", color: "white", border: "none",
              padding: "12px 24px", borderRadius: "8px", fontSize: "16px", cursor: "pointer"
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

function PageTracker() {
  usePageTracking();
  return null;
}

function AppInitializer() {
  useEffect(() => {
    checkAppVersion();
    initTrackingFromConsent();
    trackSessionStart(false);

    flushEventQueue();
    const handleOnline = () => flushEventQueue();
    window.addEventListener("online", handleOnline);

    const initGeo = async () => {
      const geoData = await detectUserCountry();
      if (geoData) {
        localStorage.setItem("userCountryCode", geoData.country);
        localStorage.setItem("userCountryName", geoData.countryName);
        localStorage.setItem("userCity", geoData.city);

        const isComMx = window.location.hostname.endsWith("geobooker.com.mx");
        const isCapacitor = window.Capacitor?.isNativePlatform?.();
        const savedLang = localStorage.getItem("language");
        if (!savedLang && !isComMx && !isCapacitor) {
          const country = geoData.country;
          let newLang = null;
          if (country === "FR") newLang = "fr";
          else if (["CN", "HK", "TW"].includes(country)) newLang = "zh";
          else if (["ES", "MX", "CO", "AR", "CL", "PE", "EC", "GT", "PR"].includes(country)) newLang = "es";
          else if (["US", "GB", "CA", "AU", "NZ", "IE", "DE", "IT", "NL", "BE", "SE", "NO", "FI", "DK"].includes(country)) newLang = "en";
          if (newLang && i18n.language !== newLang) {
            i18n.changeLanguage(newLang);
          }
        }
      }
    };
    initGeo();

    return () => window.removeEventListener("online", handleOnline);
  }, []);
  return null;
}

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        {/* ScrollToTop solo en web — HashRouter no necesita scroll reset */}
        {!isNative && <ScrollToTop />}
        <AuthProvider>
          <Toaster position="top-right" />
          <SessionTimeoutMonitor />
          <AppInitializer />
          <PageTracker />
          <AppProvider>
            <LocationProvider>
              <AppRouter />
              <ChatWidget />
              <InstallPWAButton variant="banner" />
              <DownloadAppModal />
              <CookieConsent />
            </LocationProvider>
          </AppProvider>
        </AuthProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
