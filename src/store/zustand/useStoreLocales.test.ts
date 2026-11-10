import i18n from "@/locales/i18n"
import { useStoreLocales } from "./useStoreLocales"

describe("locale store", () => {
  beforeEach(() => {
    localStorage.clear()
    useStoreLocales.setState({ locale: "en_us" })
    void i18n.changeLanguage("en")
  })

  it("persists locale and changes i18n language", async () => {
    useStoreLocales.getState().toggle("nl-nl")

    expect(localStorage.getItem("locale")).toBe("nl-nl")
    expect(useStoreLocales.getState().locale).toBe("nl-nl")
    expect(i18n.language).toBe("nl")
  })
})
