import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import he from './locales/he.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import de from './locales/de.json';

const LANGUAGE_KEY = 'preferred-language';

// RTL languages
const RTL_LANGUAGES = ['he', 'ar'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      es: { translation: es },
      ar: { translation: ar },
      de: { translation: de },
    },
    fallbackLng: 'en',
    lng: localStorage.getItem(LANGUAGE_KEY) || 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ['localStorage'],
    },
  });

export type SupportedLanguage = 'en' | 'he' | 'es' | 'ar' | 'de';

export const setLanguage = (lang: SupportedLanguage) => {
  localStorage.setItem(LANGUAGE_KEY, lang);
  i18n.changeLanguage(lang);
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

// Set initial direction
const currentLang = i18n.language || 'en';
document.documentElement.dir = RTL_LANGUAGES.includes(currentLang) ? 'rtl' : 'ltr';
document.documentElement.lang = currentLang;

export default i18n;
