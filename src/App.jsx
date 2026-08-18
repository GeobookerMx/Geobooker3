// src/App.jsx
import React, { useEffect, Component, lazy, Suspense } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "./lib/supabase";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { trackSessionStart } from "./services/analyticsService";
import { flushEventQueue } from "./services/analyticsService";
import { initTrackingFromConsent, enableTracking } from "./services/trackingService";
import { detectUserCountry } from "./services/geoLocationService";
import { usePageTracking } from "./hooks/usePageTracking";
// ✅ FIX Apple Guideline 2.1: ATT permission request
import { AppTrackingTransparency } from "@capgo/capacitor-app-tracking-transparency";
import i18n from "./i18n";
import { getLanguageForCountry, markAutoLanguage, shouldRespectManualLanguage } from "./utils/languagePreference";

import AppRouter from "./router";
import { checkAppVersion } from "./services/cacheVersionService";
import ScrollToTop from "./components/common/ScrollToTop";
import NativeScrollStabilizer from "./components/common/NativeScrollStabilizer";
import ScrollLockManager from "./components/common/ScrollLockManager";
import { Toaster } from "react-hot-toast";
import { captureQrAttribution } from "./services/qrAttributionService";
import { captureAttribution } from "./services/attributionService";
import { initWebVitals } from "./services/vitalsService";

const ChatWidget = lazy(() => import("./components/agent/ChatWidget"));
const CookieConsent = lazy(() => import("./components/CookieConsent"));

// ✅ FIX iPad/iOS: HashRouter en nativo (capacitor://) — BrowserRouter en web
// BrowserRouter falla en Capacitor porque usa HTML5 History API sobre file://
const isNative = Capacitor.isNativePlatform();
const Router = isNative ? HashRouter : BrowserRouter;

const PUBLIC_NATIVE_PATH_PREFIXES = [
  '/business',
  '/cities',
  '/city',
  '/ciudad',
  '/category',
  '/c',
  '/claim',
  '/advertise',
  '/enterprise',
  '/b2b-connect',
  '/download',
  '/emprende',
  '/space',
  '/reset-password'
];

const AUTH_LINK_PATHS = ['/auth/callback', '/reset-password'];

async function handleNativeAuthLink(url) {
  if (!url || typeof window === 'undefined') return false;

  try {
    const urlObj = new URL(url);
    const isKnownHost = ['geobooker.com.mx', 'www.geobooker.com.mx', 'www.geobooker.com', 'geobooker.com'].includes(urlObj.hostname);
    const isCustomScheme = urlObj.protocol === 'geobooker:';
    const customPath = isCustomScheme ? `/${urlObj.hostname}${urlObj.pathname}` : urlObj.pathname;
    const targetPath = customPath.replace(/\/+/g, '/');
    const isAuthLink = AUTH_LINK_PATHS.some((path) => targetPath === path || targetPath.startsWith(`${path}/`));

    if ((!isKnownHost && !isCustomScheme) || !isAuthLink) return false;

    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch (error) {
      console.warn('[Auth Global] No fue necesario cerrar el navegador:', error);
    }

    const isRecovery = targetPath.startsWith('/reset-password') ||
      urlObj.searchParams.get('type') === 'recovery' ||
      new URLSearchParams(urlObj.hash.replace(/^#/, '')).get('type') === 'recovery';
    const code = urlObj.searchParams.get('code');

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      window.location.hash = isRecovery ? '/reset-password' : '/';
      return true;
    }

    const tokenParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
    const accessToken = tokenParams.get('access_token') || urlObj.searchParams.get('access_token');
    const refreshToken = tokenParams.get('refresh_token') || urlObj.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      window.location.hash = isRecovery ? '/reset-password' : '/';
      return true;
    }

    if (urlObj.searchParams.has('error')) {
      const description = urlObj.searchParams.get('error_description') || urlObj.searchParams.get('error');
      window.location.hash = `/login?error=${encodeURIComponent(description)}`;
      return true;
    }

    window.location.hash = isRecovery ? '/reset-password' : `/auth/callback${urlObj.search || ''}`;
    return true;
  } catch (error) {
    console.error('[Auth Global] Error procesando el enlace de autenticacion:', error);
    window.location.hash = '/login?error=auth_failed';
    return true;
  }
}

function routeNativeDeepLinkToApp(url) {
  if (!url || typeof window === 'undefined') return false;

  try {
    const urlObj = new URL(url);
    if (urlObj.href.includes('auth/callback')) return false;

    const isKnownHost = ['geobooker.com.mx', 'www.geobooker.com.mx', 'www.geobooker.com', 'geobooker.com'].includes(urlObj.hostname);
    const isCustomScheme = urlObj.protocol === 'geobooker:';
    const customPath = isCustomScheme ? `/${urlObj.hostname}${urlObj.pathname}` : urlObj.pathname;
    const targetPath = customPath.replace(/\/+/g, '/');
    const isAllowedPath = PUBLIC_NATIVE_PATH_PREFIXES.some((prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`));

    if ((!isKnownHost && !isCustomScheme) || !isAllowedPath) return false;

    window.location.hash = `${targetPath}${urlObj.search || ''}${urlObj.hash || ''}`;
    return true;
  } catch (error) {
    console.warn('[App Global] Could not parse native deep link:', error);
    return false;
  }
}


// ✅ FIX OAuth iOS Global Listener: Registrar a nivel de módulo lo antes posible
// Captura el deep link de inmediato al reanudar la app, evitando race conditions con React.
if (isNative) {
  try {
    CapApp.addListener('appUrlOpen', async (data) => {
      console.log('[App Global] Deep link recibido:', data.url);
      if (await handleNativeAuthLink(data?.url)) {
        console.log('[App Global] Enlace de autenticacion procesado');
      } else if (routeNativeDeepLinkToApp(data?.url)) {
        console.log('[App Global] Public deep link routed inside app');
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
    initWebVitals(); // Envia LCP, INP, CLS, FCP, TTFB a GA4 (sin costo operacional)

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
      CapApp.getLaunchUrl()
        .then(async (launchData) => {
          if (launchData?.url && await handleNativeAuthLink(launchData.url)) {
            console.log('[App] Initial auth deep link processed');
          } else if (launchData?.url && routeNativeDeepLinkToApp(launchData.url)) {
            console.log('[App] Initial public deep link routed inside app');
          }
        })
        .catch((err) => console.warn('[App] Could not read launch URL:', err));
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
            if (status === "authorized") {
              enableTracking();
            }
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
        localStorage.setItem("userCountry", geoData.country);
        localStorage.setItem("userCountryName", geoData.countryName);
        localStorage.setItem("userCity", geoData.city);

        const countryLanguage = getLanguageForCountry(geoData.country);
        const hasManualLanguage = shouldRespectManualLanguage();

        if (countryLanguage && !hasManualLanguage && i18n.language !== countryLanguage) {
          markAutoLanguage(countryLanguage);
          i18n.changeLanguage(countryLanguage);
        }
      }
    };
    initGeo();
    captureAttribution(window.location.href);
    captureQrAttribution(window.location.href);

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
        {/* ✅ ScrollLockManager: Previene scroll automático hacia el centro en Web, iOS y Android */}
        <ScrollLockManager />
        {/* ScrollToTop solo en web — HashRouter no necesita scroll reset */}
        {!isNative && <ScrollToTop />}
        {/* ✅ NativeScrollStabilizer: Previene scroll automático en iOS y Android */}
        <NativeScrollStabilizer />
        <AuthProvider>
          <Toaster position="top-right" />
          <SessionTimeoutMonitor />
          <AppInitializer />
          <PageTracker />
          <AppProvider>
            <LocationProvider>
              <AppRouter />
              <Suspense fallback={null}>
                <ChatWidget />
                <CookieConsent />
              </Suspense>
            </LocationProvider>
          </AppProvider>
        </AuthProvider>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
