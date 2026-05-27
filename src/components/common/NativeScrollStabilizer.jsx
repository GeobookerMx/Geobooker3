// src/components/common/NativeScrollStabilizer.jsx
// ✅ FIX: Scroll automático no deseado en iOS y Android (WKWebView / WebView)
// Previene que el viewport se desplace solo al cargar, cambiar ruta o volver del background.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export default function NativeScrollStabilizer() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // 1. Desactivar restauración automática de scroll del navegador
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 2. Forzar scroll a (0,0) en cada cambio de ruta
    const resetScroll = () => {
      // Esperar un frame para que React haya terminado de renderizar
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        // También resetear el contenedor #root por si tiene overflow
        const root = document.getElementById('root');
        if (root) {
          root.scrollTop = 0;
          root.scrollLeft = 0;
        }
        // Resetear body también
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      });
    };

    resetScroll();

    // 3. Solo en dispositivos nativos (iOS/Android): escuchar evento de regreso del background
    if (isNative) {
      const handleResume = () => {
        requestAnimationFrame(resetScroll);
      };

      // El evento 'resume' de Capacitor se dispara al volver de background
      document.addEventListener('resume', handleResume);

      // También escuchar el evento de visibilidad (más compatible con iOS WKWebView)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          resetScroll();
        }
      });

      return () => {
        document.removeEventListener('resume', handleResume);
        document.removeEventListener('visibilitychange', resetScroll);
      };
    }
  }, [pathname, hash]);

  // No renderiza nada en el DOM
  return null;
}
