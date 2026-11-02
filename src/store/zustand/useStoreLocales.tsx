import { create } from "zustand"
import i18n, { localeToLanguage, type AppLocale } from "@/locales/i18n"

interface SidebarStore {
  locale: AppLocale
  toggle: (locale: AppLocale) => void
}

const storedLocale = localStorage.getItem("locale") as AppLocale | null
const initialLocale: AppLocale = storedLocale || "en_us"

export const useStoreLocales = create<SidebarStore>((set) => ({
  locale: initialLocale,
  toggle: (value) => {
    localStorage.setItem("locale", value)
    void i18n.changeLanguage(localeToLanguage[value])
    set({ locale: value })
  }
}))
