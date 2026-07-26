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

const recoverFromStaleChunk = async (reason = 'unknown') => {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === '1') return;

  sessionStorage.setItem(CHUNK_RECOVERY_KEY, '1');
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

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromStaleChunk('vite_preload_error');
});

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '');
  if (message.includes('Failed to fetch dynamically imported module') || message.includes('Importing a module script failed')) {
    recoverFromStaleChunk('dynamic_import_failed');
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
