import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';

const resources = {
  en: { translation: en },
};

// Only 'en' is shipped today (matches the Flutter app, which also only
// has an English ARB despite having the full l10n pipeline wired up).
// Device locales we don't have a translation for fall back to English
// rather than showing missing-key strings.
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const supportedLanguage = deviceLanguage in resources ? deviceLanguage : 'en';

i18next.use(initReactI18next).init({
  resources,
  lng: supportedLanguage,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false, // React Native text is not HTML; no need to escape.
  },
});

export default i18next;
