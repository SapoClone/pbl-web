import { describe, expect, it } from "vitest"
import { resolveGatewayUrl } from "./env-config"

describe("gateway address", () => {
  it("is the origin of the production API URL, so non-platform calls leave the web app's domain", () => {
    expect(resolveGatewayUrl(undefined, "https://api.sapo.makeasy.id.vn/platform/api/v1")).toBe("https://api.sapo.makeasy.id.vn")
  })
  it("keeps a port and ignores the path", () => {
    expect(resolveGatewayUrl(undefined, "http://localhost:8080/platform/api/v1")).toBe("http://localhost:8080")
  })
  it("falls back to the same origin when the API URL is relative (the dev server proxies)", () => {
    expect(resolveGatewayUrl(undefined, "/platform/api/v1")).toBe("/")
  })
  it("lets VITE_GATEWAY_URL win, without a trailing slash", () => {
    expect(resolveGatewayUrl("https://gw.example.com/", "https://api.sapo.makeasy.id.vn/platform/api/v1")).toBe("https://gw.example.com")
  })
  it("ignores a blank VITE_GATEWAY_URL", () => {
    expect(resolveGatewayUrl("  ", "https://api.sapo.makeasy.id.vn/platform/api/v1")).toBe("https://api.sapo.makeasy.id.vn")
  })
})
