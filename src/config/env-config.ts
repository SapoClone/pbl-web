const defaultApiUrl =
	"http://pbl-api-1448699134.ap-southeast-1.elb.amazonaws.com/api/v1"

export const API_URL =
	(import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
	(import.meta.env.DEV ? "/api/v1" : defaultApiUrl)
