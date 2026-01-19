import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones
import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';
import translationZH from './locales/zh/translation.json';
import translationJA from './locales/ja/translation.json';
import translationKO from './locales/ko/translation.json';

// Recursos de traducción
const resources = {
    es: { translation: translationES },
    en: { translation: translationEN },
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
            const saved = localStorage.getItem('language');
            if (saved) return saved;

            const hostname = window.location.hostname;
            if (hostname.endsWith('geobooker.com')) return 'en';
            if (hostname.endsWith('geobooker.com.mx')) return 'es';

            return navigator.language?.split('-')[0] || 'es';
        })(),
        fallbackLng: 'es',
        supportedLngs: ['es', 'en', 'zh', 'ja', 'ko'],
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
