export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "/platform/api/v1"

export const USE_MOCK_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH !== "false"

export const USE_MOCK_ADMIN =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_ADMIN !== "false"
