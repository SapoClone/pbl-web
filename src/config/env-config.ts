const trimSlash = (value: string | undefined) => value?.trim().replace(/\/$/, "") || undefined

/** The platform service's base URL (sign-in, stores, members...) */
export const API_URL = trimSlash(import.meta.env.VITE_API_URL as string | undefined) || "/platform/api/v1"

/**
 * The gateway address that serves every other service as `/<service>/api/v1/...`.
 * `VITE_GATEWAY_URL` wins. Otherwise it is the origin of an absolute API URL (production sets only
 * `VITE_API_URL`, on the API domain: without this the calls go to the web app's own domain, which answers
 * every path with `index.html`). Otherwise `/`: the dev server proxies the service paths.
 */
export function resolveGatewayUrl(gatewayUrl: string | undefined, apiUrl: string): string {
	const explicit = trimSlash(gatewayUrl)
	if (explicit) return explicit
	try {
		return new URL(apiUrl).origin
	} catch {
		return "/"
	}
}

export const GATEWAY_URL = resolveGatewayUrl(import.meta.env.VITE_GATEWAY_URL as string | undefined, API_URL)
