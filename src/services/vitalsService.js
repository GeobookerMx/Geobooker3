// src/services/vitalsService.js
/**
 * Core Web Vitals Reporter — Geobooker
 * Captura LCP, INP, CLS, FCP, TTFB y los envia a GA4.
 * Sin costo operacional: usa el gtag de GA4 ya configurado en index.html.
 * Sin acceso a datos privados: solo mide tiempos de carga de la pagina publica.
 */

/**
 * Envia una metrica de Web Vitals a Google Analytics 4.
 * Usa gtag si esta disponible en el contexto (pagina web).
 * En la app nativa de Capacitor se omite silenciosamente.
 */
function sendToGA4({ name, delta, value, id, rating }) {
    try {
        if (typeof window === 'undefined') return;
        if (typeof window.gtag !== 'function') return;

        window.gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: id,
            value: Math.round(name === 'CLS' ? delta * 1000 : delta),
            metric_rating: rating,        // 'good' | 'needs-improvement' | 'poor'
            metric_value: Math.round(value),
            non_interaction: true,        // No afecta bounce rate
            page_path: window.location.pathname
        });
    } catch (e) {
        // Silencioso: nunca romper la app por un error de analytics
    }
}

/**
 * Inicializa la captura de Core Web Vitals.
 * Solo se ejecuta en contexto web (no en Capacitor nativo).
 * Se llama una vez desde main.jsx o App.jsx.
 */
export function initWebVitals() {
    try {
        // Solo correr en el navegador, nunca en SSR o nativo
        if (typeof window === 'undefined') return;

        // Importacion dinamica para no bloquear el bundle inicial
        import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
            onCLS(sendToGA4);   // Cumulative Layout Shift (< 0.1 = bueno)
            onINP(sendToGA4);   // Interaction to Next Paint (< 200ms = bueno)
            onLCP(sendToGA4);   // Largest Contentful Paint (< 2.5s = bueno)
            onFCP(sendToGA4);   // First Contentful Paint
            onTTFB(sendToGA4);  // Time to First Byte
        }).catch(() => {
            // Si falla la carga del modulo, la app sigue funcionando normal
        });
    } catch (e) {
        // Silencioso
    }
}
