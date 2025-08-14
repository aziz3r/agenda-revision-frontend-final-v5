import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des ressources locales
import fr from './locales/fr/common.json';
import en from './locales/en/common.json';

void i18n
  .use(LanguageDetector)        // détection (localStorage, navigateur, ?lng=)
  .use(initReactI18next)        // binding React
  .init({
    resources: {
      fr: { common: fr },
      en: { common: en }
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React échappe déjà
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;
