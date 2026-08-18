// ✅ PREVENT PROGRAMMATIC FOCUS FROM CAUSING AUTOMATIC SCROLL-TO-CENTER IN WEBVIEWS (iOS / Android)
// Google Maps and other libraries often call focus() on their containers, causing WebViews to auto-scroll.
if (typeof window !== 'undefined' && typeof HTMLElement !== 'undefined' && HTMLElement.prototype.focus) {
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(options) {
    if (!options || typeof options !== 'object') {
      options = { preventScroll: true };
    } else if (options.preventScroll === undefined) {
      options.preventScroll = true;
    }
    return originalFocus.call(this, options);
  };
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/ios-android-viewport-fix.css'
import './i18n' // Importar configuración de i18n

const CHUNK_RECOVERY_KEY = 'geobooker_chunk_recovery_attempted';
const BOOTSTRAP_RECOVERY_KEY = 'geobooker_bootstrap_recovery_attempted';
const RECOVERY_COOLDOWN_MS = 30_000;
const BOOT_STABILIZATION_MS = 10_000;

window.__GEOBOOKER_BOOTSTRAPPED__ = true;

const claimChunkRecovery = (reason) => {
  if (typeof window === 'undefined') return false;

  try {
    const recoveryState = JSON.parse(sessionStorage.getItem(CHUNK_RECOVERY_KEY) || 'null');
    if (recoveryState?.attemptedAt && Date.now() - recoveryState.attemptedAt < RECOVERY_COOLDOWN_MS) {
      return false;
    }

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify({
      attemptedAt: Date.now(),
      reason,
      path: window.location.pathname
    }));
    return true;
  } catch (error) {
    console.warn('[Geobooker] Recovery guard is unavailable:', error);
    return false;
  }
};

const recoverFromStaleChunk = async (reason = 'unknown') => {
  try {
    window.gtag?.('event', 'stale_chunk_recovery', { reason });
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update().catch(() => null)));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.includes('geobooker')).map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('[Geobooker] Chunk recovery cleanup failed:', error);
  } finally {
    window.location.reload();
  }
};

const beginChunkRecovery = (reason) => {
  if (!claimChunkRecovery(reason)) return false;
  void recoverFromStaleChunk(reason);
  return true;
};

window.addEventListener('vite:preloadError', (event) => {
  if (beginChunkRecovery('vite_preload_error')) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '');
  if (message.includes('Failed to fetch dynamically imported module') || message.includes('Importing a module script failed')) {
    beginChunkRecovery('dynamic_import_failed');
  }
});

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_SCROLL_SPY === 'true') {
  import('./debug/scrollSpy').then(({ installScrollSpy }) => installScrollSpy());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />  {/* ✅ Simple y limpio */}
  </React.StrictMode>,
)

// A recovery guard must survive the reload long enough to stop a loop. Once
// React has remained booted successfully, both bootstrap guards can be reset
// so a later, independent deploy incident can recover in the same tab.
window.setTimeout(() => {
  const root = document.getElementById('root');
  if (!root?.hasChildNodes()) return;

  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    sessionStorage.removeItem(BOOTSTRAP_RECOVERY_KEY);
  } catch (error) {
    console.warn('[Geobooker] Could not reset recovery guards:', error);
  }

  window.dispatchEvent(new Event('geobooker:boot-success'));
}, BOOT_STABILIZATION_MS);
