import i18n, { use } from "i18next"
import { initReactI18next } from "react-i18next"

import translationEN from "./translationEN.json"
import translationNL from "./translationNL.json"

const resources = {
  en: {
    translation: translationEN
  },
  nl: {
    translation: translationNL
  }
}

use(initReactI18next).init({
  resources,
  lng: "en",
  keySeparator: false,
  interpolation: {
    escapeValue: false
  }
})

export default i18n
