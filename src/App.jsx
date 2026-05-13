// src/App.jsx
import React, { useEffect, Component } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { trackSessionStart } from "./services/analyticsService";
import { flushEventQueue } from "./services/analyticsService";
import { initTrackingFromConsent } from "./services/trackingService";
import { detectUserCountry } from "./services/geoLocationService";
import { usePageTracking } from "./hooks/usePageTracking";
// ✅ FIX Apple Guideline 2.1: ATT permission request
import { AppTrackingTransparency } from "@capgo/capacitor-app-tracking-transparency";
import i18n from "./i18n";

import AppRouter from "./router";
import ChatWidget from "./components/agent/ChatWidget";
import { checkAppVersion } from "./services/cacheVersionService";
import ScrollToTop from "./components/common/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import { Toaster } from "react-hot-toast";

// ✅ FIX iPad/iOS: HashRouter en nativo (capacitor://) — BrowserRouter en web
// BrowserRouter falla en Capacitor porque usa HTML5 History API sobre file://
const isNative = Capacitor.isNativePlatform();
const Router = isNative ? HashRouter : BrowserRouter;

// ✅ FIX OAuth iOS Global Listener: Registrar a nivel de módulo lo antes posible
// Captura el deep link de inmediato al reanudar la app, evitando race conditions con React.
if (isNative) {
  try {
    CapApp.addListener('appUrlOpen', async (data) => {
      console.log('[App Global] Deep link recibido:', data.url);
      if (data?.url?.includes('auth/callback')) {
        try {
          // 1. Cerrar el navegador in-app de forma inmediata y fulminante
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
          console.log('[App Global] Navegador in-app cerrado exitosamente');
        } catch (e) {
          console.warn('[App Global] Error al cerrar Browser:', e);
        }

        try {
          const { supabase } = await import('./lib/supabase');
          const urlObj = new URL(data.url);

          // 2A. Verificar si viene un código de autorización PKCE (?code=xxxx)
          // Supabase JS v2 en iOS nativo utiliza el flujo PKCE por defecto.
          const code = urlObj.searchParams.get('code');
          if (code) {
            console.log('[Auth Global] Intercambiando código PKCE por sesión...');
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            console.log('[Auth Global] Sesión PKCE configurada exitosamente');
            window.location.hash = '/';
            return;
          }

          // 2B. Fallback: extraer tokens directamente del hash (#access_token=xxxx)
          const hashStr = urlObj.hash.replace(/^#/, '');
          const urlParams = new URLSearchParams(hashStr);
          const access_token = urlParams.get('access_token');
          const refresh_token = urlParams.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('[Auth Global] Configurando sesión con access_token...');
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            console.log('[Auth Global] Sesión de tokens configurada nativamente');
            window.location.hash = '/';
            return;
          }

          // 2C. Manejo de error explícito devuelto por el proveedor
          if (urlObj.searchParams.has('error')) {
            const errDesc = urlObj.searchParams.get('error_description') || urlObj.searchParams.get('error');
            window.location.hash = `/login?error=${encodeURIComponent(errDesc)}`;
            return;
          }

          // Fallback final por si la estructura requiere ser procesada por AuthCallback
          window.location.hash = `/auth/callback${urlObj.hash || urlObj.search}`;
        } catch (err) {
          console.error('[Auth Global] Error crítico procesando deep link:', err);
          window.location.hash = '/login?error=auth_failed';
        }
      }
    });
    console.log('[App Global] Listener appUrlOpen registrado exitosamente a nivel raíz');
  } catch (err) {
    console.warn('[App Global] No se pudo registrar listener global:', err);
  }
}


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

    // ✅ FIX Bug #3: Refrescar sesión cuando la app vuelve al primer plano (Android/iOS)
    // Sin esto el token expira en background y el usuario ve la pantalla de login al regresar
    let appStateListener = null;

    if (Capacitor.isNativePlatform()) {
      const setupNativeListeners = async () => {
        try {
          appStateListener = await CapApp.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
              const { supabase } = await import('./lib/supabase');
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                await supabase.auth.refreshSession();
                console.log('[Auth] Sesión refrescada al volver al frente');
              }
            }
          });
        } catch (err) {
          console.warn('[App] No se pudo configurar listeners nativos:', err);
        }
      };
      setupNativeListeners();
    }

    // ✅ FIX Apple Guideline 2.1 (build 19): Solicitar permiso ATT en iOS
    // iOS solo muestra el diálogo cuando la app está en UIApplicationState.active.
    // Esperamos al evento appStateChange con isActive=true antes de pedirlo.
    let attListener = null;
    const requestATTPermission = async () => {
      try {
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

        // 1) Verificar status actual — solo pedir si no se ha decidido
        const { status: currentStatus } = await AppTrackingTransparency.getStatus();
        console.log("[ATT] Status inicial:", currentStatus);
        localStorage.setItem("att_status", currentStatus);

        if (currentStatus !== "notDetermined") return;

        // 2) Esperar a que la app esté completamente activa (splash fuera)
        const fireRequest = async () => {
          // Pequeño delay extra para asegurar que la UI esté visible
          await new Promise(r => setTimeout(r, 1500));
          try {
            const { status } = await AppTrackingTransparency.requestPermission();
            console.log("[ATT] Resultado del prompt:", status);
            localStorage.setItem("att_status", status);
          } catch (e) {
            console.warn("[ATT] requestPermission falló:", e);
          }
        };

        // Si la app ya está activa, dispara de inmediato
        const state = await CapApp.getState();
        if (state.isActive) {
          fireRequest();
        } else {
          // Si no, espera el primer appStateChange con isActive=true
          attListener = await CapApp.addListener("appStateChange", ({ isActive }) => {
            if (isActive) {
              fireRequest();
              if (attListener) {
                attListener.remove();
                attListener = null;
              }
            }
          });
        }
      } catch (err) {
        console.warn("[ATT] No se pudo solicitar permiso:", err);
      }
    };
    requestATTPermission();

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

    return () => {
      window.removeEventListener("online", handleOnline);
      if (appStateListener) appStateListener.remove();
      if (attListener) attListener.remove();
    };
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
              <CookieConsent />
            </LocationProvider>
          </AppProvider>
        </AuthProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
