import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("axios clients", () => {
  it("send platform calls and every other service's calls to the API domain in production", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.sapo.makeasy.id.vn/platform/api/v1")
    vi.resetModules()
    const { axiosClient, gatewayClient } = await import("./index")
    expect(axiosClient.defaults.baseURL).toBe("https://api.sapo.makeasy.id.vn/platform/api/v1")
    expect(gatewayClient.defaults.baseURL).toBe("https://api.sapo.makeasy.id.vn")
    expect(gatewayClient.getUri({ url: "/sales/api/v1/orders/summary" })).toBe("https://api.sapo.makeasy.id.vn/sales/api/v1/orders/summary")
  })

  it("stay on the same origin for the dev server proxy when no API URL is set", async () => {
    vi.stubEnv("VITE_API_URL", "")
    vi.resetModules()
    const { axiosClient, gatewayClient } = await import("./index")
    expect(axiosClient.defaults.baseURL).toBe("/platform/api/v1")
    expect(gatewayClient.defaults.baseURL).toBe("/")
  })

  it("turns an index.html answer into an error instead of data", async () => {
    vi.resetModules()
    const { gatewayClient } = await import("./index")
    const html = "<!DOCTYPE html><html></html>"
    await expect(
      gatewayClient.get("/sales/api/v1/orders/summary", {
        adapter: async (config) => ({ data: html, status: 200, statusText: "OK", headers: { "content-type": "text/html" }, config })
      })
    ).rejects.toThrow(/got a web page/)
  })
})
