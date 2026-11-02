const defaultApiUrl =
	"http://pbl-api-1448699134.ap-southeast-1.elb.amazonaws.com/api/v1"

export const API_URL =
	(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
	(import.meta.env.DEV ? "/api/v1" : defaultApiUrl)

export const USE_MOCK_AUTH =
	import.meta.env.DEV &&
	import.meta.env.VITE_USE_MOCK_AUTH !== "false"

export const USE_MOCK_ADMIN =
	import.meta.env.DEV &&
	import.meta.env.VITE_USE_MOCK_ADMIN !== "false"
