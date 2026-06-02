import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import id from "./locales/id.json";
import tr from "./locales/tr.json";
import ru from "./locales/ru.json";
import ja from "./locales/ja.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import bn from "./locales/bn.json";
import ur from "./locales/ur.json";
import sw from "./locales/sw.json";

const LANGUAGES_WITH_TRANSLATIONS = ["en", "zh", "es", "fr", "de", "pt", "id", "tr", "ru", "ja", "hi", "ar", "bn", "ur", "sw"];

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
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    pt: { translation: pt },
    id: { translation: id },
    tr: { translation: tr },
    ru: { translation: ru },
    ja: { translation: ja },
    hi: { translation: hi },
    ar: { translation: ar },
    bn: { translation: bn },
    ur: { translation: ur },
    sw: { translation: sw },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
