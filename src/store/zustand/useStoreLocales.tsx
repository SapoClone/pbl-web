import { create } from "zustand"

type Locale = "en_us" | "en-gb" | "nl-nl"

interface SidebarStore {
  locale: Locale
  toggle: (locale: Locale) => void
}

const initialValues = {
  locale: (localStorage.getItem("locale")! || "en_us") as Locale
}

export const useStoreLocales = create<SidebarStore>((set) => ({
  ...initialValues,
  toggle: (value) => set(() => ({ locale: value }))
}))
