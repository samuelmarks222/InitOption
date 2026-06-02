import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import es from "./locales/es.json";

const LANGUAGES_WITH_TRANSLATIONS = ["en", "zh", "es"];

const detectLanguage = (): string => {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem("trading_terminal_preferences_v1");
    if (raw) {
      const prefs = JSON.parse(raw);
      if (prefs?.language && LANGUAGES_WITH_TRANSLATIONS.includes(prefs.language)) {
        return prefs.language;
      }
    }
  } catch {}
  return "en";
};

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh }, es: { translation: es } },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
