import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones
import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationZH from './locales/zh/translation.json';
import translationJA from './locales/ja/translation.json';
import translationKO from './locales/ko/translation.json';

// Recursos de traducción
const resources = {
    es: { translation: translationES },
    en: { translation: translationEN },
    fr: { translation: translationFR },
    zh: { translation: translationZH },
    ja: { translation: translationJA },
    ko: { translation: translationKO }
};

i18n
    .use(initReactI18next) // Pasa i18n a react-i18next
    .init({
        resources,
        // Detección INTELIGENTE de idioma:
        // 1. Preferencia guardada del usuario (localStorage)
        // 2. Dominio (.com -> en, .mx -> es)
        // 3. Idioma del navegador
        // 4. Fallback a español
        lng: (() => {
            // 1. Forzar por parámetro de URL (útil para pruebas y enlaces directos)
            const params = new URLSearchParams(window.location.search);
            const forceLang = params.get('lng');
            if (forceLang && ['es', 'en', 'fr', 'zh', 'ja', 'ko'].includes(forceLang)) {
                return forceLang;
            }

            // 2. Preferencia guardada del usuario (localStorage)
            const saved = localStorage.getItem('language');
            if (saved) return saved;

            // 3. Dominio (.com -> en, .mx -> es)
            const hostname = window.location.hostname;
            if (hostname.endsWith('geobooker.com')) return 'en';
            if (hostname.endsWith('geobooker.com.mx')) return 'es';
            if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                // Para desarrollo, podemos usar un parámetro o dejar el default
            }

            // 4. Fallback por país detectado (IP cache de ejecuciones previas)
            const geoCache = localStorage.getItem('geo_country_cache');
            if (geoCache) {
                try {
                    const parsed = JSON.parse(geoCache);
                    const country = parsed.data?.country || parsed.country;
                    if (country === 'FR') return 'fr';
                    if (['CN', 'HK', 'TW'].includes(country)) return 'zh';
                    if (['JP'].includes(country)) return 'ja';
                    if (['KR'].includes(country)) return 'ko';
                    if (['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'GT', 'PR'].includes(country)) return 'es';
                    // Países angloparlantes o resto del mundo -> Inglés
                    return 'en';
                } catch (e) {
                    console.error('Error parsing geo cache:', e);
                }
            }

            // 5. Idioma del navegador
            const browserLang = navigator.language?.split('-')[0];
            if (['es', 'en', 'fr', 'zh', 'ja', 'ko'].includes(browserLang)) {
                return browserLang;
            }

            return 'es';
        })(),
        fallbackLng: 'es',
        supportedLngs: ['es', 'en', 'fr', 'zh', 'ja', 'ko'],
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: false
        }
    });

// Guardar preferencia de idioma cuando cambie
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
});

export default i18n;
