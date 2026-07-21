import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getInitialLanguage, markAutoLanguage, normalizeLanguage } from './utils/languagePreference';

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
        // Deteccion inteligente de idioma:
        // 1. Parametro ?lng= para pruebas o enlaces directos
        // 2. Preferencia manual guardada por el usuario
        // 3. Pais detectado desde cache o IP
        // 4. Idioma del navegador
        // 5. Fallback global a ingles
        lng: getInitialLanguage(),
        fallbackLng: 'en',
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
    const normalized = normalizeLanguage(lng);
    if (!normalized) return;

    if (localStorage.getItem('languagePreferenceSource') === 'manual') {
        localStorage.setItem('language', normalized);
    } else {
        markAutoLanguage(normalized);
    }
});

export default i18n;
