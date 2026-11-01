import i18n, { use } from "i18next"
import { initReactI18next } from "react-i18next"

import translationEN from "./translationEN.json"
import translationVI from "./translationVI.json"

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
  lng: "vi",
  fallbackLng: "en",
  keySeparator: false,
  interpolation: {
    escapeValue: false
  }
})

export default i18n
