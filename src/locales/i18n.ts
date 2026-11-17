import i18n, { use } from "i18next"
import { initReactI18next } from "react-i18next"

import translationEN from "./translationEN.json"
import translationVI from "./translationVI.json"

export type AppLocale = "en_us" | "en-gb" | "nl-nl"

export const localeToLanguage: Record<AppLocale, "en" | "nl"> = {
  en_us: "en",
  "en-gb": "en",
  "nl-nl": "nl"
}

const resources = {
  en: {
    translation: translationEN
  },
  vi: {
    translation: translationVI
  }
}

use(initReactI18next).init({
  resources,
  lng: localeToLanguage[
    (localStorage.getItem("locale") as AppLocale | null) || "en_us"
  ],
  fallbackLng: "en",
  keySeparator: false,
  interpolation: {
    escapeValue: false
  }
})

export default i18n
