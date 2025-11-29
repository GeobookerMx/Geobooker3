import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones
import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';

// Recursos de traducción
const resources = {
    es: {
        translation: translationES
    },
    en: {
        translation: translationEN
    }
};

i18n
    .use(initReactI18next) // Pasa i18n a react-i18next
    .init({
        resources,
        lng: localStorage.getItem('language') || 'es', // Idioma por defecto: español
        fallbackLng: 'es', // Idioma de respaldo
        interpolation: {
            escapeValue: false // React ya escapa por defecto
        },
        react: {
            useSuspense: false // Desactivar suspense para evitar problemas de carga
        }
    });

// Guardar preferencia de idioma cuando cambie
i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
});

export default i18n;
