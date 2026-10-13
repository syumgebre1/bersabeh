/**
 * i18next setup for the mobile app.
 *
 * Wiring:
 *   - 3 resources: en, am, ti
 *   - fallback language: en (missing keys in am/ti fall back to en)
 *   - language persisted in Zustand (AsyncStorage)
 *
 * Hermes compatibility:
 *   React Native's Hermes engine does not support Intl.PluralRules fully.
 *   We set compatibilityJSON: "v3" so pluralization works without Intl.
 *
 * Usage in components:
 *   import { useTranslation } from "react-i18next";
 *   const { t } = useTranslation();
 *   <Text>{t("hero.headline")}</Text>
 *
 * Sync with Zustand:
 *   Call `setAppLanguage(lang)` from anywhere. It updates both i18next
 *   and the Zustand store, and persists to AsyncStorage.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import am from "@/locales/am.json";
import ti from "@/locales/ti.json";

import { useAppStore, type Language } from "@/store/app";


export const resources = {
  en: { translation: en },
  am: { translation: am },
  ti: { translation: ti },
} as const;


// Initialize once at module load. The Zustand store is read AFTER hydration
// by the root layout, which calls `setAppLanguage(store.language)`.
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      compatibilityJSON: "v3",
      interpolation: { escapeValue: false },  // React already escapes
      returnNull: false,
      initImmediate: false,
    });
}


/**
 * Change the app-wide language.
 * Syncs i18next + the Zustand store (which persists to AsyncStorage).
 */
export function setAppLanguage(lang: Language): Promise<unknown> {
  useAppStore.getState().setLanguage(lang);
  return i18n.changeLanguage(lang);
}


export default i18n;
