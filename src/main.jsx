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

// 🔍 Scroll Spy para auditoría forense de scroll/focus automáticos
import { installScrollSpy } from './debug/scrollSpy'
installScrollSpy()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />  {/* ✅ Simple y limpio */}
  </React.StrictMode>,
)