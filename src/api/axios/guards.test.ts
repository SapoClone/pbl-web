import { describe, expect, it } from "vitest"
import { htmlResponseError, isHtmlResponse } from "./guards"

describe("HTML answers to API calls", () => {
  it("spots the index.html a CDN returns for an unknown path", () => {
    expect(isHtmlResponse({ data: "<!DOCTYPE html>\n<html>", headers: { "content-type": "text/html" } })).toBe(true)
    expect(isHtmlResponse({ data: "  <!doctype html><html>", headers: {} })).toBe(true)
    expect(isHtmlResponse({ data: {}, headers: { "content-type": "text/html; charset=utf-8" } })).toBe(true)
  })
  it("lets JSON and CSV through", () => {
    expect(isHtmlResponse({ data: { needsAction: { total: 0 } }, headers: { "content-type": "application/json" } })).toBe(false)
    expect(isHtmlResponse({ data: "a,b\n1,2", headers: { "content-type": "text/csv" } })).toBe(false)
    expect(isHtmlResponse({ data: "", headers: undefined as never })).toBe(false)
  })
  it("names the URL in the error", () => {
    expect(htmlResponseError("/sales/api/v1/orders/summary").message).toContain("/sales/api/v1/orders/summary")
  })
})
