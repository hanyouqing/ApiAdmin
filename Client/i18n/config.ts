import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const resources = {
  'en-US': {
    translation: en,
  },
  'zh-CN': {
    translation: zhCN,
  },
};

const savedLocale = localStorage.getItem('locale') || 'en-US';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLocale,
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

