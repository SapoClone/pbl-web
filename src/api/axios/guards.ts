import type { AxiosResponse } from "axios"

/**
 * True when an API call was answered with a web page. The usual cause is a wrong API address: the CDN of the web app
 * answers every unknown path with `index.html` and status 200, which would otherwise be read as data.
 */
export function isHtmlResponse(response: Pick<AxiosResponse, "data" | "headers">): boolean {
  const type = String((response.headers as Record<string, unknown> | undefined)?.["content-type"] ?? "").toLowerCase()
  if (type.includes("text/html")) return true
  return typeof response.data === "string" && /^\s*<!doctype html/i.test(response.data)
}

export function htmlResponseError(url: string | undefined): Error {
  return new Error(`Expected JSON from ${url ?? "the API"} but got a web page: the API address is probably wrong`)
}
